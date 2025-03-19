import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';


@Module({
  imports: [
    GatewayModule,
    DatabaseModule,
    RedisModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
