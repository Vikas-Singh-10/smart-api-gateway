import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gateway } from '../database/schemas/Gateway.schema';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class MicroservicesService {
  private readonly logger = new Logger(MicroservicesService.name);
  private readonly serviceCacheKey = 'microservices:config';

  constructor(
    @InjectModel(Gateway.name)
    private readonly gatewayModel: Model<Gateway>,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly cacheService: CacheService,
  ) {}

  async getServiceUrl(serviceName: string): Promise<string> {
    // Try to get from cache first
    const cachedConfig = await this.cacheService.getCache<Record<string, string>>(this.serviceCacheKey);
    if (cachedConfig?.[serviceName]) {
      return cachedConfig[serviceName];
    }

    // If not in cache, get from database
    const gateway = await this.gatewayModel.findOne({ name: serviceName, isActive: true });
    if (!gateway) {
      throw new Error(`Service ${serviceName} not found or inactive`);
    }

    // Update cache
    await this.updateServiceCache();

    return gateway.url;
  }

  async getServiceApiKey(serviceName: string): Promise<string> {
    const gateway = await this.gatewayModel.findOne({ name: serviceName, isActive: true });
    if (!gateway) {
      throw new Error(`Service ${serviceName} not found or inactive`);
    }
    return gateway.apiKey;
  }

  private async updateServiceCache(): Promise<void> {
    const gateways = await this.gatewayModel.find({ isActive: true });
    const config = gateways.reduce((acc, gateway) => {
      acc[gateway.name] = gateway.url;
      return acc;
    }, {} as Record<string, string>);

    await this.cacheService.setCache(this.serviceCacheKey, config, 3600); // 1 hour expiry
  }

  async makeRequest(serviceName: string, endpoint: string, data: any): Promise<any> {
    // Check circuit breaker first
    if (!await this.circuitBreakerService.canCall(serviceName)) {
      throw new Error(`${serviceName} is currently unavailable`);
    }

    try {
      const url = await this.getServiceUrl(serviceName);
      const apiKey = await this.getServiceApiKey(serviceName);
      
      const response = await fetch(`${url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Service request failed: ${response.statusText}`);
      }

      await this.circuitBreakerService.recordSuccess(serviceName);
      return await response.json();
    } catch (error) {
      await this.circuitBreakerService.recordFailure(serviceName);
      throw error;
    }
  }

  async registerService(serviceConfig: {
    name: string;
    url: string;
    apiKey: string;
  }): Promise<Gateway> {
    const gateway = new this.gatewayModel(serviceConfig);
    await gateway.save();
    await this.updateServiceCache();
    return gateway;
  }

  async updateService(
    serviceName: string,
    updates: Partial<{
      url: string;
      apiKey: string;
      isActive: boolean;
    }>,
  ): Promise<Gateway> {
    const gateway = await this.gatewayModel.findOneAndUpdate(
      { name: serviceName },
      { $set: updates },
      { new: true },
    );
    
    if (!gateway) {
      throw new Error(`Service ${serviceName} not found`);
    }

    await this.updateServiceCache();
    return gateway;
  }

  async deactivateService(serviceName: string): Promise<void> {
    await this.gatewayModel.findOneAndUpdate(
      { name: serviceName },
      { $set: { isActive: false } },
    );
    await this.updateServiceCache();
  }

  // Get all instances of a specific service type
  async getInstancesByType(serviceType: string): Promise<Gateway[]> {
    return this.gatewayModel.find({
      serviceType,
      isActive: true
    }).sort({ priority: -1 }).exec();
  }

  // Get all instances of a service type in a specific region
  async getInstancesByTypeAndRegion(serviceType: string, region: string): Promise<Gateway[]> {
    return this.gatewayModel.find({
      serviceType,
      region,
      isActive: true
    }).sort({ priority: -1 }).exec();
  }

  // Get the best instance of a service type
  async getBestInstance(serviceType: string, preferredRegion?: string): Promise<Gateway | null> {
    // First check if circuit breaker allows calls to this service type
    if (!await this.circuitBreakerService.canCall(serviceType)) {
      throw new Error(`Service type ${serviceType} is currently unavailable`);
    }

    // Get all instances
    let instances: Gateway[];
    
    if (preferredRegion) {
      // Try to get instances in the preferred region first
      instances = await this.getInstancesByTypeAndRegion(serviceType, preferredRegion);
      
      // If no instances in preferred region, get all instances
      if (instances.length === 0) {
        instances = await this.getInstancesByType(serviceType);
      }
    } else {
      instances = await this.getInstancesByType(serviceType);
    }

    if (instances.length === 0) {
      return null;
    }

    // Filter out instances that are marked as unhealthy by the circuit breaker
    const healthyInstances: Gateway[] = [];
    
    for (const instance of instances) {
      if (await this.circuitBreakerService.canCall(instance.name)) {
        healthyInstances.push(instance);
      }
    }

    if (healthyInstances.length === 0) {
      return null;
    }

    // Return the highest priority healthy instance
    return healthyInstances[0];
  }

  // Make a request to the best instance of a service type
  async makeRequestToServiceType(
    serviceType: string, 
    endpoint: string, 
    data: any, 
    preferredRegion?: string
  ): Promise<any> {
    const instance = await this.getBestInstance(serviceType, preferredRegion);
    
    if (!instance) {
      throw new Error(`No healthy instances available for service type ${serviceType}`);
    }
    
    try {
      const response = await this.makeRequest(instance.name, endpoint, data);
      return response;
    } catch (error) {
      // If this instance failed, try another one
      await this.circuitBreakerService.recordFailure(instance.name);
      
      // Get all instances again, excluding the one that just failed
      const instances = await this.getInstancesByType(serviceType);
      const otherInstances = instances.filter(i => i.name !== instance.name);
      
      if (otherInstances.length === 0) {
        throw new Error(`All instances of ${serviceType} are unavailable`);
      }
      
      // Try the next best instance
      const nextInstance = otherInstances[0];
      return this.makeRequest(nextInstance.name, endpoint, data);
    }
  }

  // Register a new service instance
  async registerServiceInstance(instanceData: {
    name: string;
    serviceType: string;
    url: string;
    apiKey: string;
    region?: string;
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<Gateway> {
    const gateway = new this.gatewayModel(instanceData);
    await gateway.save();
    await this.updateServiceCache();
    return gateway;
  }

  // Check if a service instance exists by name
  async serviceExists(name: string): Promise<boolean> {
    const count = await this.gatewayModel.countDocuments({ name });
    return count > 0;
  }
} 