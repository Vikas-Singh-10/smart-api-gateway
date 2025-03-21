import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AIModel extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true, type: Object })
  modelTopology: any;

  @Prop({ required: true, type: Object })
  weightSpecs: any[];

  @Prop({ required: true, type: Buffer })
  weightData: Buffer;

  @Prop()
  metadata: Record<string, any>;
}

export const AIModelSchema = SchemaFactory.createForClass(AIModel); 