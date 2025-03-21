import { Controller, All, Req, Res, HttpStatus, Get, Post, Param } from '@nestjs/common';
import { Request, Response } from 'express';
import { SmartGatewayService } from '../gateway/smart-gateway.service';

@Controller('api')
export class SmartApiController {
  constructor(private readonly smartGatewayService: SmartGatewayService) {}

  /**
   * Handle all API requests with intelligent routing
   */
  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    try {
      // Extract request details
      const path = req.path.replace(/^\/api/, '');
      const body = req.body;
      const headers = req.headers as Record<string, string>;
      const method = req.method;
      
      // Use smart gateway to route the request
      const response = await this.smartGatewayService.proxyRequest({
        path,
        body,
        headers,
        method,
      });
      
      // Return the response
      return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      console.error('Error processing request:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error processing request',
        error: error.message,
      });
    }
  }
  
  /**
   * Get health metrics for all services
   */
  @Get('admin/health')
  async getHealthStatus(@Res() res: Response) {
    try {
      const healthStatus = await this.smartGatewayService.getHealthStatus();
      return res.status(HttpStatus.OK).json(healthStatus);
    } catch (error) {
      console.error('Error fetching health status:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error fetching health status',
        error: error.message,
      });
    }
  }
  
  /**
   * Reset circuit for a service instance
   */
  @Post('admin/reset-circuit/:serviceId')
  async resetCircuit(@Param('serviceId') serviceId: string, @Res() res: Response) {
    try {
      this.smartGatewayService.resetCircuit(serviceId);
      return res.status(HttpStatus.OK).json({
        message: `Circuit for ${serviceId} has been reset`
      });
    } catch (error) {
      console.error('Error resetting circuit:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Error resetting circuit',
        error: error.message,
      });
    }
  }
} 