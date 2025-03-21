import { Module } from '@nestjs/common';
import { AiRoutingService } from './ai-routing.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [AiRoutingService],
  exports: [AiRoutingService],
})
export class AiRoutingModule {} 