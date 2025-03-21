import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MicroservicesService } from '../src/microservices/microservices.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('RegisterServices');
  // Create NestJS app
  const app = await NestFactory.create(AppModule);
  
  // Get the MicroservicesService
  const microservicesService = app.get(MicroservicesService);
  
  logger.log('Registering service instances...');
  
  // Function to register a service if it doesn't exist
  async function registerIfNotExists(serviceData) {
    try {
      // Check if service already exists
      const exists = await microservicesService.serviceExists(serviceData.name);
      
      if (exists) {
        logger.log(`Service ${serviceData.name} already exists, skipping`);
        return;
      }
      
      // Register new service
      await microservicesService.registerServiceInstance(serviceData);
      logger.log(`Registered service: ${serviceData.name}`);
    } catch (error) {
      logger.error(`Error registering service ${serviceData.name}: ${error.message}`);
    }
  }
  
  // Register payment service instances
  await registerIfNotExists({
    name: 'payment-service-01',
    serviceType: 'payment-gateway',
    url: 'https://payment-api-01.example.com',
    apiKey: 'payment-api-key-1',
    region: 'us-east',
    priority: 10
  });
  
  await registerIfNotExists({
    name: 'payment-service-02',
    serviceType: 'payment-gateway',
    url: 'https://payment-api-02.example.com',
    apiKey: 'payment-api-key-2',
    region: 'us-west',
    priority: 5
  });
  
  await registerIfNotExists({
    name: 'payment-service-03',
    serviceType: 'payment-gateway',
    url: 'https://payment-api-03.example.com',
    apiKey: 'payment-api-key-3',
    region: 'eu-west',
    priority: 5
  });
  
  // Register order service instances
  await registerIfNotExists({
    name: 'order-service-01',
    serviceType: 'order-gateway',
    url: 'https://order-api-01.example.com',
    apiKey: 'order-api-key-1',
    region: 'us-east',
    priority: 10
  });
  
  await registerIfNotExists({
    name: 'order-service-02',
    serviceType: 'order-gateway',
    url: 'https://order-api-02.example.com',
    apiKey: 'order-api-key-2',
    region: 'eu-west',
    priority: 5
  });
  
  // Register user service instances
  await registerIfNotExists({
    name: 'user-service-01',
    serviceType: 'user-gateway',
    url: 'https://user-api-01.example.com',
    apiKey: 'user-api-key-1',
    region: 'us-east',
    priority: 10
  });
  
  await registerIfNotExists({
    name: 'user-service-02',
    serviceType: 'user-gateway',
    url: 'https://user-api-02.example.com',
    apiKey: 'user-api-key-2',
    region: 'us-west',
    priority: 5
  });
  
  // Register product service instances
  await registerIfNotExists({
    name: 'product-service-01',
    serviceType: 'product-gateway',
    url: 'https://product-api-01.example.com',
    apiKey: 'product-api-key-1', 
    region: 'us-east',
    priority: 10
  });
  
  await registerIfNotExists({
    name: 'product-service-02',
    serviceType: 'product-gateway',
    url: 'https://product-api-02.example.com',
    apiKey: 'product-api-key-2',
    region: 'eu-west',
    priority: 5
  });
  
  logger.log('Service registration complete!');
  
  // Close the application
  await app.close();
}

bootstrap().catch(error => {
  console.error('Error registering services:', error);
  process.exit(1);
}); 