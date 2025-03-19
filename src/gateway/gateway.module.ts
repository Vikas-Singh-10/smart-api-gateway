import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { GatewayConfigService } from './gateway-config.service';
import { GatewayConfig, GatewayConfigSchema } from '../database/schemas/gateway-config.schema';

@Module({
  imports: [
    // Provides HttpService for making HTTP requests to external gateways
    HttpModule,
    // Registers the GatewayConfig schema so that the GatewayConfigService can query the DB.
    MongooseModule.forFeature([{ name: GatewayConfig.name, schema: GatewayConfigSchema }]),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, GatewayConfigService],
  exports: [GatewayService],
})
export class GatewayModule {}
