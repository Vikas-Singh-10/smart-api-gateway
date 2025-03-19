import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(@InjectConnection() private connection: Connection) {}

  onModuleInit() {
    this.connection.on('connected', () => {
      console.log('✅ Connected to MongoDB');
    });

    this.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
  }
} 