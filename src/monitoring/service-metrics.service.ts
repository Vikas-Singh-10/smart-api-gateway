import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

interface ServiceMetrics {
  serviceId: string;
  requestCount: number;
  errorCount: number;
  responseTime: number[];
  errorRate: number;
  lastUpdated: number;
}

@Injectable()
export class ServiceMetricsService {
  private readonly logger = new Logger(ServiceMetricsService.name);
  private readonly metrics: Map<string, ServiceMetrics> = new Map();
  
  constructor(private readonly cacheService: CacheService) {
    // Start periodic metrics cleanup
    setInterval(() => this.cleanupMetrics(), 3600000); // Every hour
  }
  
  /**
   * Record a successful request
   */
  recordRequest(serviceId: string, responseTime: number): void {
    const metrics = this.getOrCreateMetrics(serviceId);
    
    metrics.requestCount++;
    metrics.responseTime.push(responseTime);
    
    // Keep only the last 100 response times
    if (metrics.responseTime.length > 100) {
      metrics.responseTime.shift();
    }
    
    // Update error rate
    metrics.errorRate = (metrics.errorCount / metrics.requestCount) * 100;
    metrics.lastUpdated = Date.now();
    
    // Cache metrics for distributed systems
    this.cacheMetrics(serviceId, metrics);
  }
  
  /**
   * Record a failed request
   */
  recordError(serviceId: string, responseTime: number): void {
    const metrics = this.getOrCreateMetrics(serviceId);
    
    metrics.requestCount++;
    metrics.errorCount++;
    metrics.responseTime.push(responseTime);
    
    // Keep only the last 100 response times
    if (metrics.responseTime.length > 100) {
      metrics.responseTime.shift();
    }
    
    // Update error rate
    metrics.errorRate = (metrics.errorCount / metrics.requestCount) * 100;
    metrics.lastUpdated = Date.now();
    
    // Cache metrics for distributed systems
    this.cacheMetrics(serviceId, metrics);
  }
  
  /**
   * Calculate health score for a service (0-100)
   */
  async calculateHealthScore(serviceId: string): Promise<number> {
    const metrics = await this.getMetrics(serviceId);
    if (!metrics) return 100; // Default to perfect health if no metrics
    
    // Start with perfect score
    let score = 100;
    
    // Reduce score based on error rate (each % of errors = -1 point)
    score -= metrics.errorRate;
    
    // Reduce score based on response time
    // Average response time > 1000ms reduces score
    const avgResponseTime = this.getAverageResponseTime(metrics);
    if (avgResponseTime > 1000) {
      // Every 100ms above 1000ms = -1 point, up to -20
      score -= Math.min(20, Math.floor((avgResponseTime - 1000) / 100));
    }
    
    // Recency factor - recent errors have more impact
    const timeSinceLastUpdate = Date.now() - metrics.lastUpdated;
    if (metrics.errorRate > 0 && timeSinceLastUpdate < 60000) { // Within last minute
      score -= 10; // Recent errors reduce score more
    }
    
    return Math.max(0, Math.min(100, score)); // Ensure score is between 0-100
  }
  
  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceId: string): ServiceMetrics {
    return this.getOrCreateMetrics(serviceId);
  }
  
  /**
   * Get all service metrics
   */
  getAllServiceMetrics(): ServiceMetrics[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Get or create metrics for a service
   */
  private getOrCreateMetrics(serviceId: string): ServiceMetrics {
    if (!this.metrics.has(serviceId)) {
      this.metrics.set(serviceId, {
        serviceId,
        requestCount: 0,
        errorCount: 0,
        responseTime: [],
        errorRate: 0,
        lastUpdated: Date.now()
      });
    }
    
    return this.metrics.get(serviceId)!;
  }
  
  /**
   * Calculate average response time
   */
  private getAverageResponseTime(metrics: ServiceMetrics): number {
    if (metrics.responseTime.length === 0) return 0;
    
    const sum = metrics.responseTime.reduce((a, b) => a + b, 0);
    return sum / metrics.responseTime.length;
  }
  
  /**
   * Cache metrics in Redis for distributed systems
   */
  private async cacheMetrics(serviceId: string, metrics: ServiceMetrics): Promise<void> {
    try {
      await this.cacheService.setCache(`metrics:${serviceId}`, metrics, 3600);
    } catch (error) {
      this.logger.error(`Failed to cache metrics for ${serviceId}`, error);
    }
  }
  
  /**
   * Get metrics from cache
   */
  private async getMetrics(serviceId: string): Promise<ServiceMetrics | null> {
    try {
      // Try to get from local cache first
      if (this.metrics.has(serviceId)) {
        return this.metrics.get(serviceId)!;
      }
      
      // Try to get from Redis
      const cachedMetrics = await this.cacheService.getCache<ServiceMetrics>(`metrics:${serviceId}`);
      
      if (cachedMetrics) {
        // Update local cache
        this.metrics.set(serviceId, cachedMetrics);
        return cachedMetrics;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get metrics for ${serviceId}`, error);
      return null;
    }
  }
  
  /**
   * Clean up old metrics
   */
  private cleanupMetrics(): void {
    const now = Date.now();
    const staleThreshold = 86400000; // 24 hours
    
    for (const [serviceId, metrics] of this.metrics.entries()) {
      if (now - metrics.lastUpdated > staleThreshold) {
        this.metrics.delete(serviceId);
        this.logger.log(`Cleaned up stale metrics for ${serviceId}`);
      }
    }
  }
} 