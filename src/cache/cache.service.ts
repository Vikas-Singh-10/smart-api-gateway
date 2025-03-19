import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  async getCache<T>(key: string): Promise<T | null> {
    const cachedData = await this.redisClient.get(key);
    return cachedData ? JSON.parse(cachedData) : null;
  }

  async setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async deleteCache(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
