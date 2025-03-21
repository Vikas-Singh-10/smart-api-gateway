import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Service failing, reject calls
  HALF_OPEN = 'half-open', // Testing if service recovered
}

interface CircuitOptions {
  failureThreshold: number;   // Number of failures before opening circuit
  resetTimeout: number;       // Time in ms before attempting recovery
  failureWindow: number;      // Time window to count failures
  monitorInterval: number;    // Interval to check circuit state
}

interface CircuitData {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastStateChange: number;
  options: CircuitOptions;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly defaultOptions: CircuitOptions = {
    failureThreshold: 5,
    resetTimeout: 30000,      // 30 seconds
    failureWindow: 60000,     // 1 minute
    monitorInterval: 5000,    // 5 seconds
  };

  constructor(private readonly cacheService: CacheService) {
    // Start monitoring circuit states
    setInterval(() => this.monitorCircuits(), 1000);
  }

  private async getCircuit(serviceId: string): Promise<CircuitData | null> {
    const circuitData = await this.cacheService.getCache<CircuitData>(`circuit:${serviceId}`);
    return circuitData;
  }

  private async setCircuit(serviceId: string, circuitData: CircuitData): Promise<void> {
    await this.cacheService.setCache(`circuit:${serviceId}`, circuitData, 3600); // 1 hour expiry
  }

  private async initCircuit(serviceId: string, options?: Partial<CircuitOptions>): Promise<void> {
    const circuitData: CircuitData = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailure: 0,
      lastStateChange: Date.now(),
      options: { ...this.defaultOptions, ...options },
    };
    await this.setCircuit(serviceId, circuitData);
  }

  async canCall(serviceId: string): Promise<boolean> {
    const circuit = await this.getCircuit(serviceId);
    if (!circuit) {
      await this.initCircuit(serviceId);
      return true;
    }
    
    switch (circuit.state) {
      case CircuitState.CLOSED:
        return true;
      
      case CircuitState.OPEN:
        const now = Date.now();
        if (now - circuit.lastStateChange > circuit.options.resetTimeout) {
          await this.setCircuitState(serviceId, CircuitState.HALF_OPEN);
          return true;
        }
        return false;
      
      case CircuitState.HALF_OPEN:
        return true;
    }
  }

  async recordSuccess(serviceId: string): Promise<void> {
    const circuit = await this.getCircuit(serviceId);
    if (!circuit) {
      await this.initCircuit(serviceId);
      return;
    }
    
    if (circuit.state === CircuitState.HALF_OPEN) {
      await this.setCircuitState(serviceId, CircuitState.CLOSED);
      this.logger.log(`Circuit for ${serviceId} closed after successful recovery`);
    }
    
    circuit.failures = 0;
    await this.setCircuit(serviceId, circuit);
  }

  async recordFailure(serviceId: string): Promise<void> {
    const circuit = await this.getCircuit(serviceId);
    if (!circuit) {
      await this.initCircuit(serviceId);
      return;
    }
    
    const now = Date.now();
    circuit.failures++;
    circuit.lastFailure = now;
    
    if (circuit.state === CircuitState.HALF_OPEN) {
      await this.setCircuitState(serviceId, CircuitState.OPEN);
      this.logger.warn(`Circuit for ${serviceId} reopened after failed recovery attempt`);
    } 
    else if (circuit.state === CircuitState.CLOSED && 
             circuit.failures >= circuit.options.failureThreshold) {
      await this.setCircuitState(serviceId, CircuitState.OPEN);
      this.logger.warn(`Circuit for ${serviceId} opened after ${circuit.failures} failures`);
    }

    await this.setCircuit(serviceId, circuit);
  }

  async configureCircuit(serviceId: string, options: Partial<CircuitOptions>): Promise<void> {
    const circuit = await this.getCircuit(serviceId);
    if (!circuit) {
      await this.initCircuit(serviceId, options);
      return;
    }
    
    circuit.options = { ...circuit.options, ...options };
    await this.setCircuit(serviceId, circuit);
  }

  private async setCircuitState(serviceId: string, state: CircuitState): Promise<void> {
    const circuit = await this.getCircuit(serviceId);
    if (!circuit) {
      await this.initCircuit(serviceId);
      return;
    }
    
    circuit.state = state;
    circuit.lastStateChange = Date.now();
    await this.setCircuit(serviceId, circuit);
  }

  private async monitorCircuits(): Promise<void> {
    // Note: In Redis implementation, we don't need to actively monitor circuits
    // as Redis handles expiration automatically
    // This method is kept for future extensibility
  }

  async getCircuitState(serviceId: string): Promise<CircuitState> {
    const circuit = await this.getCircuit(serviceId);
    return circuit?.state || CircuitState.CLOSED;
  }

  async resetCircuit(serviceId: string): Promise<void> {
    const circuit = await this.getCircuit(serviceId);
    if (circuit) {
      await this.setCircuitState(serviceId, CircuitState.CLOSED);
      circuit.failures = 0;
      await this.setCircuit(serviceId, circuit);
      this.logger.log(`Circuit for ${serviceId} manually reset to CLOSED`);
    }
  }
} 