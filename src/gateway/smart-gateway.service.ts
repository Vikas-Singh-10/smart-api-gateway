import { Injectable, Logger } from '@nestjs/common';
import { MicroservicesService } from '../microservices/microservices.service';
import { AiRoutingService } from '../ai-routing/ai-routing.service';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { ServiceMetricsService } from '../monitoring/service-metrics.service';
import { GatewayService } from './gateway.service';
import axios, { AxiosRequestConfig } from 'axios';

interface ProxyRequestOptions {
  path: string;
  body: any;
  headers: Record<string, string>;
  method?: string;
  timeout?: number;
}

@Injectable()
export class SmartGatewayService {
  private readonly logger = new Logger(SmartGatewayService.name);
  
  constructor(
    private readonly microservicesService: MicroservicesService,
    private readonly aiRoutingService: AiRoutingService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly metricsService: ServiceMetricsService,
    private readonly gatewayService: GatewayService,
  ) {}
  
  /**
   * Process an API request using AI routing and select the best service instance
   */
  async processRequest(path: string, body: any, headers: Record<string, string>): Promise<any> {
    try {
      // 1. Determine the service type using AI
      const serviceType = await this.aiRoutingService.determineRoute(path, body, headers);
      this.logger.log(`AI routing determined service type: ${serviceType}`);

      // 2. Extract geographic region from headers or request (for region-specific routing)
      const region = headers['x-preferred-region'] || this.getRegionFromRequest(headers);
      
      // 3. Forward request to the best instance of the determined service type
      const response = await this.microservicesService.makeRequestToServiceType(
        serviceType,
        path,
        body,
        region
      );
      
      return response;
    } catch (error) {
      this.logger.error(`Error processing request: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract region from user's request (IP-based, header-based, etc.)
   */
  private getRegionFromRequest(headers: Record<string, string>): string | undefined {
    // This is a simplified implementation
    // In a real app, you might:
    // 1. Use GeoIP lookup based on the user's IP
    // 2. Check cookies for user preferences
    // 3. Use browser's navigator.language
    
    if (headers['x-forwarded-for']) {
      // Here you would do a GeoIP lookup of the IP address
      // For demo, we'll return a mock region
      return 'us-east';
    }
    
    if (headers['accept-language']?.includes('en-US')) {
      return 'us-east';
    }
    
    if (headers['accept-language']?.includes('en-GB')) {
      return 'eu-west';
    }
    
    return undefined; // Let the system choose the best available instance
  }
  
  /**
   * Smart proxy request with AI-based routing and circuit breaking
   */
  async proxyRequest(options: ProxyRequestOptions): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Step 1: Use AI to determine which gateway category to route to
      const gatewayType = await this.aiRoutingService.determineRoute(
        options.path, 
        options.body, 
        options.headers
      );
      
      // Step 2: Get available instances for this gateway type
      const gatewayInstances = await this.getGatewayInstances(gatewayType);
      if (!gatewayInstances || gatewayInstances.length === 0) {
        throw new Error(`No instances available for gateway: ${gatewayType}`);
      }
      
      // Step 3: Choose best instance based on metrics
      const instanceIds = gatewayInstances.map(g => g.id);
      const metrics = instanceIds.map(id => this.metricsService.getServiceMetrics(id));
      
      // Get health scores and rank instances
      const healthScores = await Promise.all(
        gatewayInstances.map(instance => this.metricsService.calculateHealthScore(instance.id))
      );
      
      // Rank instances by health score
      const rankedInstances = gatewayInstances.map((instance, index) => ({
        instance,
        health: healthScores[index]
      }))
      .sort((a, b) => b.health - a.health); // Sort by health descending
      
      // Step 4: Try instances in order of health score
      for (const { instance } of rankedInstances) {
        // Check if circuit is closed for this instance
        if (!await this.circuitBreakerService.canCall(instance.id)) {
          this.logger.warn(`Circuit open for ${instance.id}, skipping`);
          continue;
        }
        
        try {
          // Forward the request to the selected instance
          const response = await this.forwardRequest(instance, options);
          
          // Record success
          const requestDuration = Date.now() - startTime;
          this.metricsService.recordRequest(instance.id, requestDuration);
          this.circuitBreakerService.recordSuccess(instance.id);
          
          this.logger.log(`Request to ${instance.id} completed in ${requestDuration}ms`);
          return response;
        } catch (err) {
          // Record failure
          const requestDuration = Date.now() - startTime;
          this.metricsService.recordError(instance.id, requestDuration);
          this.circuitBreakerService.recordFailure(instance.id);
          
          this.logger.error(`Request to ${instance.id} failed: ${err.message}`);
          
          // Continue to next instance if available
          if (rankedInstances.findIndex(item => item.instance.id === instance.id) < rankedInstances.length - 1) {
            this.logger.log(`Trying next instance for ${gatewayType}`);
            continue;
          }
          
          // No more instances to try
          throw err;
        }
      }
      
      throw new Error(`All instances for ${gatewayType} are unavailable`);
    } catch (error) {
      const requestDuration = Date.now() - startTime;
      this.logger.error(`Request failed after ${requestDuration}ms: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Forward request to a specific gateway instance
   */
  private async forwardRequest(gateway: any, options: ProxyRequestOptions): Promise<any> {
    const { path, body, headers, method = 'POST', timeout = 30000 } = options;
    
    // Build target URL
    const url = `${gateway.url}${path}`;
    
    // Build request config
    const requestConfig: AxiosRequestConfig = {
      method,
      url,
      data: body,
      headers: {
        ...headers,
        'Authorization': `Bearer ${gateway.apiKey}`,
      },
      timeout,
    };
    
    // Send request
    const response = await axios(requestConfig);
    return response.data;
  }
  
  /**
   * Get available gateway instances of a specific type
   */
  private async getGatewayInstances(gatewayType: string): Promise<any[]> {
    // This would come from your gateway registry
    // For now we'll use a simple approach with the existing gateway service
    try {
      const gateway = await this.gatewayService.getGatewayById(gatewayType);
      // In a real system, this would return multiple instances of the same type
      return [{ 
        id: gateway.id || gateway.name,
        name: gateway.name,
        url: gateway.url, 
        apiKey: gateway.apiKey 
      }];
    } catch (error) {
      this.logger.error(`Failed to get instances for ${gatewayType}`, error);
      return [];
    }
  }
  
  /**
   * Get health status for all gateway instances
   */
  async getHealthStatus(): Promise<any[]> {
    const allMetrics = this.metricsService.getAllServiceMetrics();
    
    const healthStatusPromises = allMetrics.map(async metrics => {
      const health = await this.metricsService.calculateHealthScore(metrics.serviceId);
      return {
        serviceId: metrics.serviceId,
        health,
        errorRate: metrics.errorRate.toFixed(2) + '%',
        avgResponseTime: metrics.responseTime.length > 0 
          ? (metrics.responseTime.reduce((sum, t) => sum + t, 0) / metrics.responseTime.length).toFixed(2) + 'ms'
          : 'N/A',
        requestCount: metrics.requestCount,
        circuitState: this.circuitBreakerService.getCircuitState(metrics.serviceId),
        lastUpdated: new Date(metrics.lastUpdated).toISOString()
      };
    });
    
    return Promise.all(healthStatusPromises);
  }
  
  /**
   * Reset circuit for a specific gateway instance
   */
  async resetCircuit(serviceId: string): Promise<void> {
    await this.circuitBreakerService.resetCircuit(serviceId);
    this.logger.log(`Circuit for ${serviceId} manually reset`);
  }
} 