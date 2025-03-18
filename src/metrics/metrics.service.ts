import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  // storing in local memory for now
  private metricsData: { [endpoint: string]: { count: number; totalResponseTime: number } } = {};

  recordMetrics(endpoint: string, responseTime: number) {
    if (!this.metricsData[endpoint]) {
      this.metricsData[endpoint] = { count: 0, totalResponseTime: 0 };
    }
    this.metricsData[endpoint].count += 1;
    this.metricsData[endpoint].totalResponseTime += responseTime;
  }

  getMetrics() {
    return this.metricsData;
  }
}
