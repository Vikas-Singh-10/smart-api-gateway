import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gateway } from '../database/schemas/Gateway.schema';
import { CacheService } from '../cache/cache.service';
import { encrypt, decrypt } from '../utils/crypto.util';
import axios from 'axios';
import { UpdateGatewayDto } from './dtos/update-gateway.dto';

@Injectable()
export class GatewayService {
  constructor(
    @InjectModel(Gateway.name)
    private readonly gatewayModel: Model<Gateway>,
    private readonly cacheService: CacheService,
  ) {}

  // Create or update gateway configuration with encrypted apiKey.
  async createGateway(config: Partial<Gateway>): Promise<Gateway> {
    // Encrypt the API key before saving.
    if (config.apiKey) {
      config.apiKey = encrypt(config.apiKey);
    }
    const newConfig = new this.gatewayModel(config);
    const savedConfig = await newConfig.save();
    // Cache the configuration after creation.
    await this.cacheService.setCache(
      `gateway:${savedConfig.name}`,
      savedConfig,
      3600,
    );
    // Decrypt before returning so that caller receives the plain API key.
    savedConfig.apiKey = decrypt(savedConfig.apiKey);
    return savedConfig;
  }

  async getGatewayById(id: string): Promise<Gateway> {
    // Try fetching from Redis
    const cachedGateway = await this.cacheService.getCache<Gateway>(
      `gateway:${id}`,
    );
    if (cachedGateway) return cachedGateway;

    // Fallback to MongoDB if not in cache
    const gateway = await this.gatewayModel.findById(id).exec();
    if (!gateway) throw new NotFoundException('Gateway not found');

    // Cache the result for future requests
    await this.cacheService.setCache(`gateway:${id}`, gateway, 3600);
    return gateway;
  }

  async updateGateway(
    id: string,
    updateGatewayDto: UpdateGatewayDto,
  ): Promise<Gateway> {
    const existingGateway = await this.gatewayModel.findById(id);
    if (!existingGateway) throw new NotFoundException('Gateway not found');

    // Encrypt new API key if provided
    if (updateGatewayDto.apiKey) {
      updateGatewayDto.apiKey = encrypt(updateGatewayDto.apiKey);
    }

    // Delete the existing cache entry
    await this.cacheService.deleteCache(`gateway:${existingGateway.name}`);

    // Update the gateway
    await this.gatewayModel.findByIdAndUpdate(id, updateGatewayDto).exec();

    // Cache the updated gateway
    await this.cacheService.setCache(
      `gateway:${existingGateway.name}`,
      existingGateway,
      3600,
    );

    // Get the updated gateway
    const updatedGateway = await this.getGatewayById(id);

    return updatedGateway;
  }

  async requestToGateway(gatewayName: string, endpoint: string, data: any) {
    const gateway = await this.getGatewayById(gatewayName);
    const url = `${gateway.url}${endpoint}`;
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${gateway.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  }
  
}
