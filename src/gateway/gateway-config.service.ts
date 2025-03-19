import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GatewayConfig } from '../database/schemas/gateway-config.schema';
import { CacheService } from '../cache/cache.service';
import { encrypt, decrypt } from '../utils/crypto.util';

@Injectable()
export class GatewayConfigService {
  constructor(
    @InjectModel(GatewayConfig.name) private readonly gatewayModel: Model<GatewayConfig>,
    private readonly cacheService: CacheService,
  ) {}

  async getGatewayConfig(gatewayName: string): Promise<GatewayConfig> {
    const cacheKey = `gateway-config:${gatewayName}`;

    // Check Redis cache first.
    const cachedConfig = await this.cacheService.getCache<GatewayConfig>(cacheKey);
    if (cachedConfig) {
      // Decrypt the apiKey before returning
      cachedConfig.apiKey = decrypt(cachedConfig.apiKey);
      console.log('Serving gateway config from cache.');
      return cachedConfig;
    }

    // Fallback: query MongoDB if not in cache.
    const gateway = await this.gatewayModel.findOne({ name: gatewayName }).exec();
    if (!gateway) {
      throw new NotFoundException(`Gateway configuration for ${gatewayName} not found`);
    }

    // Decrypt apiKey before caching and returning.
    gateway.apiKey = decrypt(gateway.apiKey);
    await this.cacheService.setCache(cacheKey, gateway, 3600);
    return gateway;
  }

  // Create or update gateway configuration with encrypted apiKey.
  async createGatewayConfig(config: Partial<GatewayConfig>): Promise<GatewayConfig> {
    // Encrypt the API key before saving.
    if (config.apiKey) {
      config.apiKey = encrypt(config.apiKey);
    }
    const newConfig = new this.gatewayModel(config);
    const savedConfig = await newConfig.save();
    // Cache the configuration after creation.
    await this.cacheService.setCache(`gateway-config:${savedConfig.name}`, savedConfig, 3600);
    // Decrypt before returning so that caller receives the plain API key.
    savedConfig.apiKey = decrypt(savedConfig.apiKey);
    return savedConfig;
  }
}
