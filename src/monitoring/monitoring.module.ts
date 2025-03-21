import { Module } from '@nestjs/common';
import { ServiceMetricsService } from './service-metrics.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [ServiceMetricsService],
  exports: [ServiceMetricsService],
})
export class MonitoringModule {} 