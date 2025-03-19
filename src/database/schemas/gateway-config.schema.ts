import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class GatewayConfig extends Document {
  @Prop({ required: true, unique: true })
  name: string; // e.g., 'GATEWAY_A'

  @Prop({ required: true })
  baseUrl: string; // e.g., 'https://api.gateway-a.com'

  @Prop({ required: true })
  apiKey: string; // API key for authentication

  @Prop({ default: true })
  isActive: boolean; // Whether the gateway is active
}

export const GatewayConfigSchema = SchemaFactory.createForClass(GatewayConfig);
