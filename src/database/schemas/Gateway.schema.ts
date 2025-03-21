import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Gateway extends Document {
  @Prop({ required: true, unique: true })
  name: string; // e.g., 'payment-service-01'

  @Prop({ required: true, index: true })
  serviceType: string; // e.g., 'payment-service'

  @Prop({ required: true })
  url: string; // e.g., 'https://api-01.payment-service.com'

  @Prop({ required: true })
  apiKey: string; // API key for authentication

  @Prop({ default: true })
  isActive: boolean; // Whether the gateway is active

  @Prop()
  region: string; // e.g., 'us-east', 'eu-west'

  @Prop({ default: 0 })
  priority: number; // Higher priority instances are preferred

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>; // Additional information about the instance
}

export const GatewaySchema = SchemaFactory.createForClass(Gateway);

// Create compound index for serviceType and region
GatewaySchema.index({ serviceType: 1, region: 1 });
