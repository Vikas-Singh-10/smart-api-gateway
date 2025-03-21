import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Gateway, GatewaySchema } from '../database/schemas/Gateway.schema';
import { MicroservicesService } from './microservices.service';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Gateway.name, schema: GatewaySchema }]),
    CircuitBreakerModule,
    CacheModule,
  ],
  providers: [MicroservicesService],
  exports: [MicroservicesService],
})
export class MicroservicesModule {} 