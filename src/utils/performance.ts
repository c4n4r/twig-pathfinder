// src/utils/performance.ts
// Performance profiling utilities

export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

export class PerformanceProfiler {
  private metrics: PerformanceMetrics[] = [];
  private activeProfilers: Map<
    string,
    { startTime: number; memoryBefore: number }
  > = new Map();

  start(name: string): void {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();
    this.activeProfilers.set(name, { startTime, memoryBefore });
  }

  end(name: string): PerformanceMetrics {
    const profiler = this.activeProfilers.get(name);
    if (!profiler) {
      throw new Error(`Profiler '${name}' not started`);
    }

    const endTime = performance.now();
    const memoryAfter = this.getMemoryUsage();
    const duration = endTime - profiler.startTime;
    const memoryDelta = memoryAfter - profiler.memoryBefore;

    const metrics: PerformanceMetrics = {
      name,
      startTime: profiler.startTime,
      endTime,
      duration,
      memoryBefore: profiler.memoryBefore,
      memoryAfter,
      memoryDelta,
    };

    this.metrics.push(metrics);
    this.activeProfilers.delete(name);

    return metrics;
  }

  async profile<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageDuration(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;
    return matching.reduce((sum, m) => sum + m.duration, 0) / matching.length;
  }

  getTotalDuration(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    return matching.reduce((sum, m) => sum + m.duration, 0);
  }

  getMaxDuration(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;
    return Math.max(...matching.map((m) => m.duration));
  }

  getMinDuration(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name);
    if (matching.length === 0) return 0;
    return Math.min(...matching.map((m) => m.duration));
  }

  clear(): void {
    this.metrics = [];
    this.activeProfilers.clear();
  }

  printSummary(): void {
    const summary: Record<
      string,
      { count: number; avg: number; total: number; max: number; min: number }
    > = {};

    for (const metric of this.metrics) {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          total: 0,
          max: 0,
          min: Infinity,
        };
      }
      summary[metric.name].count++;
      summary[metric.name].total += metric.duration;
      summary[metric.name].max = Math.max(
        summary[metric.name].max,
        metric.duration,
      );
      summary[metric.name].min = Math.min(
        summary[metric.name].min,
        metric.duration,
      );
    }

    for (const [name, stats] of Object.entries(summary)) {
      stats.avg = stats.total / stats.count;
      console.log(
        `[Performance] ${name}: count=${stats.count}, avg=${stats.avg.toFixed(2)}ms, total=${stats.total.toFixed(2)}ms, max=${stats.max.toFixed(2)}ms, min=${stats.min.toFixed(2)}ms`,
      );
    }
  }

  private getMemoryUsage(): number {
    // performance.memory is only available in Node.js, not in browser environments
    // For VS Code extensions, we can use process.memoryUsage()
    if (typeof process !== "undefined" && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    // Fallback for environments without memory tracking
    return 0;
  }
}

// Global profiler instance
export const profiler = new PerformanceProfiler();
