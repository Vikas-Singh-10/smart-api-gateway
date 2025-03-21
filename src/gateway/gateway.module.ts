import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { SmartGatewayService } from './smart-gateway.service';
import { Gateway, GatewaySchema } from '../database/schemas/Gateway.schema';
import { AiRoutingModule } from '../ai-routing/ai-routing.module';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { MicroservicesModule } from '../microservices/microservices.module';

@Module({
  imports: [
    // Provides HttpService for making HTTP requests to external gateways
    HttpModule,
    // Registers the Gateway schema
    MongooseModule.forFeature([{ name: Gateway.name, schema: GatewaySchema }]),
    // Import required modules for smart gateway
    AiRoutingModule,
    CircuitBreakerModule,
    MonitoringModule,
    MicroservicesModule,
  ],
  controllers: [GatewayController],
  providers: [GatewayService, SmartGatewayService],
  exports: [GatewayService, SmartGatewayService],
})
export class GatewayModule {}
