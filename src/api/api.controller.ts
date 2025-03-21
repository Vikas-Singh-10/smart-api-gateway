import { Controller, All, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { SmartGatewayService } from '../gateway/smart-gateway.service';

@Controller('api')
export class ApiController {
  constructor(
    private readonly smartGatewayService: SmartGatewayService
  ) {}

  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    try {
      // Extract the path without the /api prefix
      const path = req.path.replace(/^\/api/, '');
      
      // Use our smart gateway to process the request
      const response = await this.smartGatewayService.processRequest(
        path,
        req.body,
        req.headers as Record<string, string>
      );
      
      // Return the response from the service
      return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      console.error('Error processing request:', error);
      
      // Return appropriate status code based on error
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      
      return res.status(statusCode).json({
        message: 'Error processing request',
        error: error.message,
      });
    }
  }
} 