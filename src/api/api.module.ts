import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { AiRoutingModule } from '../ai-routing/ai-routing.module';

@Module({
  imports: [
    GatewayModule,
    AiRoutingModule
  ],
  controllers: [ApiController],
  providers: [],
})
export class ApiModule {} 