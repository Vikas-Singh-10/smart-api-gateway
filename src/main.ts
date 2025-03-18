import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Retrieve MetricsService instance from the Nest context
  const metricsService = app.get(MetricsService);
  // Apply the interceptor globally
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
