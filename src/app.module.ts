import { Module } from '@nestjs/common';
import { GatewayModule } from './gateway/gateway.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AiRoutingModule } from './ai-routing/ai-routing.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { MicroservicesModule } from './microservices/microservices.module';
import { ApiModule } from './api/api.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule, 
    RedisModule,
    GatewayModule,
    AiRoutingModule,
    CircuitBreakerModule,
    MonitoringModule,
    MicroservicesModule,
    ApiModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
