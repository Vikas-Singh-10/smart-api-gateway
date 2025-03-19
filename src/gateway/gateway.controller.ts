import { Controller, Post, Body } from '@nestjs/common';
import { GatewayService } from './gateway.service';

@Controller('gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Post()
  async handleGatewayRequest(
    @Body('gatewayName') gatewayName: string,
    @Body('endpoint') endpoint: string,
    @Body('data') data: any,
  ) {
    return this.gatewayService.requestToGateway(gatewayName, endpoint, data);
  }
}
