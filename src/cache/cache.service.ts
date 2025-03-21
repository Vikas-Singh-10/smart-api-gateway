import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS') private readonly redisClient: Redis) {}

  /**
   * Get data from cache
   */
  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set data in cache with optional expiry
   */
  async setCache<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    await this.redisClient.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds
    );
  }

  /**
   * Delete data from cache
   */
  async deleteCache(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  /**
   * Check if key exists in cache
   */
  async hasKey(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  /**
   * Set expiry for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redisClient.expire(key, ttlSeconds);
  }
}
