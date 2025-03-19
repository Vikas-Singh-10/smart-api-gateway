import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GatewayConfigService } from './gateway-config.service';

@Injectable()
export class GatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly gatewayConfigService: GatewayConfigService,
  ) {}

  async requestToGateway(gatewayName: string, endpoint: string, data: any) {
    // Retrieve configuration from DB (with decrypted apiKey)
    const config = await this.gatewayConfigService.getGatewayConfig(gatewayName);
    const targetUrl = `${config.url}/${endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(targetUrl, data, {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
        })
      );
      return response.data;
    } catch (error) {
      console.error(`Error contacting ${gatewayName}:`, error.message);
      throw new Error(`Failed to connect to ${gatewayName}`);
    }
  }
}
