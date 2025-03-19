import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

let redisClient: Redis | null = null;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS',
      useFactory: async (configService: ConfigService) => {
        if (!redisClient) {
          redisClient = new Redis({
            host: configService.get('redis.host') || 'localhost',
            port: configService.get<number>('redis.port') || 6379,
            password: configService.get('redis.password') || undefined,
            lazyConnect: true, // Prevents auto-connection on instantiation
          });

          redisClient.on('connect', () => console.log('✅ Connected to Redis'));
          redisClient.on('error', (err) => console.error('❌ Redis Error:', err));

          try {
            await redisClient.connect();
          } catch (err) {
            console.error('❌ Failed to connect to Redis:', err);
            throw err; // Ensures errors are properly propagated
          }
        }

        return redisClient;
      },
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: ['REDIS', CacheService],
})
export class RedisModule {}
