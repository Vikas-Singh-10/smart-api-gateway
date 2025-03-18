import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
// import other modules as needed

@Module({
  imports: [MetricsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
