import { Controller, All, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from '../gateway/gateway.service';

@Controller('api')
export class ApiController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    try {
      // Get the gateway name that was determined by the AI middleware
      const gatewayName = (req as any).gatewayName || 'default-gateway';
      
      // Get the path without the /api prefix
      const path = req.path.replace(/^\/api/, '');
      
      // Forward the request to the appropriate gateway
      const response = await this.gatewayService.requestToGateway(
        gatewayName,
        path,
        req.body
      );
      
      // Return the response from the gateway
      return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      console.error('Error forwarding request:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error processing request',
        error: error.message,
      });
    }
  }
} 