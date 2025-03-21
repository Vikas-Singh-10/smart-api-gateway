import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AiRoutingService } from './ai-routing.service';

@Injectable()
export class AiRoutingMiddleware implements NestMiddleware {
  constructor(private readonly aiRoutingService: AiRoutingService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract request data for AI analysis
      const path = req.path;
      const body = req.body;
      const headers = req.headers as Record<string, string>;

      // Use TensorFlow model to determine which gateway to route to
      const gatewayName = await this.aiRoutingService.determineRoute(path, body, headers);
      
      // Add the determined gateway to the request object for later use
      (req as any).gatewayName = gatewayName;
      
      // Log the routing decision
      console.log(`🧠 AI routed request "${path}" to ${gatewayName}`);
      
      next();
    } catch (error) {
      console.error('Error in AI routing middleware:', error);
      // In case of error, continue with the request but set a default gateway
      (req as any).gatewayName = 'default-gateway';
      next();
    }
  }
} 