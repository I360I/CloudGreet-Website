/**
 * React Component Optimization System
 * Provides utilities for optimizing React components with memo, useMemo, useCallback
 */

import { ComponentType, memo, useMemo, useCallback, ReactNode } from 'react';
import { logger } from '../monitoring';

export interface OptimizationConfig {
  enableMemo: boolean;
  enableUseMemo: boolean;
  enableUseCallback: boolean;
  enableVirtualization: boolean;
  memoThreshold: number; // Component re-render threshold
  useMemoThreshold: number; // Expensive computation threshold
  useCallbackThreshold: number; // Function recreation threshold
}

export interface ComponentMetrics {
  name: string;
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoized: boolean;
  optimized: boolean;
}

export interface OptimizationReport {
  component: string;
  optimizations: string[];
  performanceGain: number;
  beforeMetrics: ComponentMetrics;
  afterMetrics: ComponentMetrics;
}

export class ComponentOptimizer {
  private static readonly DEFAULT_CONFIG: OptimizationConfig = {
    enableMemo: true,
    enableUseMemo: true,
    enableUseCallback: true,
    enableVirtualization: false,
    memoThreshold: 3, // Re-render 3+ times
    useMemoThreshold: 5, // 5ms+ computation
    useCallbackThreshold: 2, // 2+ function recreations
  };

  private static componentMetrics = new Map<string, ComponentMetrics>();
  private static renderTimes = new Map<string, number[]>();

  /**
   * Create an optimized component with automatic memoization
   */
  static createOptimizedComponent<T extends Record<string, any>>(
    Component: ComponentType<T>,
    config: Partial<OptimizationConfig> = {}
  ): ComponentType<T> {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    const componentName = Component.displayName || Component.name || 'Anonymous';

    // Track component metrics
    if (!ComponentOptimizer.componentMetrics.has(componentName)) {
      ComponentOptimizer.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 0,
        lastRenderTime: 0,
        averageRenderTime: 0,
        memoized: false,
        optimized: false,
      });
      ComponentOptimizer.renderTimes.set(componentName, []);
    }

    if (!fullConfig.enableMemo) {
      return Component;
    }

    // Create memoized component
    const OptimizedComponent = memo(Component, (prevProps, nextProps) => {
      const shouldRerender = this.shouldRerender(prevProps, nextProps, componentName);
      
      if (!shouldRerender) {
        logger.debug('Component memo hit', { component: componentName });
      }

      return !shouldRerender;
    });

    OptimizedComponent.displayName = `Optimized(${componentName})`;
    
    return OptimizedComponent as ComponentType<T>;
  }

  /**
   * Create optimized useMemo hook
   */
  static createOptimizedUseMemo<T>(
    factory: () => T,
    deps: React.DependencyList,
    config: Partial<OptimizationConfig> = {}
  ): T {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (!fullConfig.enableUseMemo) {
      return factory();
    }

    // Measure computation time
    const startTime = performance.now();
    const result = useMemo(() => {
      const computationStart = performance.now();
      const value = factory();
      const computationTime = performance.now() - computationStart;
      
      if (computationTime > fullConfig.useMemoThreshold) {
        logger.debug('Expensive computation memoized', { 
          time: computationTime,
          threshold: fullConfig.useMemoThreshold 
        });
      }
      
      return value;
    }, deps);
    
    const totalTime = performance.now() - startTime;
    logger.debug('useMemo execution', { time: totalTime });

    return result;
  }

  /**
   * Create optimized useCallback hook
   */
  static createOptimizedUseCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList,
    config: Partial<OptimizationConfig> = {}
  ): T {
    const fullConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    if (!fullConfig.enableUseCallback) {
      return callback;
    }

    return useCallback(callback, deps);
  }

  /**
   * Create virtualized list component
   */
  static createVirtualizedList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 5,
  }: {
    items: T[];
    itemHeight: number;
    containerHeight: number;
    renderItem: (item: T, index: number) => ReactNode;
    overscan?: number;
  }): ReactNode {
    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(0 / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    const visibleItems = items.slice(startIndex, endIndex + 1);

    return (
      <div style={{ height: containerHeight, overflow: 'auto' }}>
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{
                position: 'absolute',
                top: (startIndex + index) * itemHeight,
                height: itemHeight,
                width: '100%',
              }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /**
   * Analyze component performance
   */
  static analyzeComponent(componentName: string): ComponentMetrics | null {
    return this.componentMetrics.get(componentName) || null;
  }

  /**
   * Get performance report for all components
   */
  static getPerformanceReport(): {
    totalComponents: number;
    optimizedComponents: number;
    averageRenderTime: number;
    topSlowComponents: ComponentMetrics[];
    recommendations: string[];
  } {
    const allMetrics = Array.from(this.componentMetrics.values());
    const totalComponents = allMetrics.length;
    const optimizedComponents = allMetrics.filter(m => m.optimized).length;
    const averageRenderTime = allMetrics.reduce((sum, m) => sum + m.averageRenderTime, 0) / totalComponents;

    const topSlowComponents = allMetrics
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
      .slice(0, 5);

    const recommendations: string[] = [];
    
    allMetrics.forEach(metrics => {
      if (metrics.renderCount > 10 && !metrics.memoized) {
        recommendations.push(`Consider memoizing ${metrics.name} (${metrics.renderCount} renders)`);
      }
      
      if (metrics.averageRenderTime > 10) {
        recommendations.push(`Optimize ${metrics.name} (${metrics.averageRenderTime}ms avg render time)`);
      }
    });

    return {
      totalComponents,
      optimizedComponents,
      averageRenderTime: Math.round(averageRenderTime * 100) / 100,
      topSlowComponents,
      recommendations,
    };
  }

  /**
   * Initialize component metrics
   */
  private static initializeMetrics(componentName: string): void {
    if (!this.componentMetrics.has(componentName)) {
      this.componentMetrics.set(componentName, {
        name: componentName,
        renderCount: 0,
        lastRenderTime: 0,
        averageRenderTime: 0,
        memoized: false,
        optimized: false,
      });
      this.renderTimes.set(componentName, []);
    }
  }

  /**
   * Track component render
   */
  static trackRender(componentName: string, renderTime: number): void {
    this.initializeMetrics(componentName);
    
    const metrics = this.componentMetrics.get(componentName)!;
    const renderTimes = this.renderTimes.get(componentName)!;
    
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    renderTimes.push(renderTime);
    
    // Keep only last 100 render times
    if (renderTimes.length > 100) {
      renderTimes.splice(0, renderTimes.length - 100);
    }
    
    // Calculate average
    metrics.averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    
    this.componentMetrics.set(componentName, metrics);
  }

  /**
   * Determine if component should re-render
   */
  private static shouldRerender(
    prevProps: Record<string, any>,
    nextProps: Record<string, any>,
    componentName: string
  ): boolean {
    // Shallow comparison of props
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) {
      return true;
    }

    for (const key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        logger.debug('Props changed', { component: componentName, key, prev: prevProps[key], next: nextProps[key] });
        return true;
      }
    }

    return false;
  }

  /**
   * Create performance monitoring hook
   */
  static createPerformanceHook(componentName: string) {
    return () => {
      const startTime = performance.now();
      
      return () => {
        const renderTime = performance.now() - startTime;
        this.trackRender(componentName, renderTime);
      };
    };
  }

  /**
   * Optimize existing component
   */
  static optimizeComponent<T extends ComponentType<any>>(
    Component: T,
    optimizations: {
      memo?: boolean;
      useMemo?: string[]; // Props to memoize
      useCallback?: string[]; // Functions to memoize
    } = {}
  ): T {
    const componentName = Component.displayName || Component.name || 'Anonymous';
    
    // Apply memo optimization
    if (optimizations.memo) {
      Component = memo(Component) as unknown as T;
    }

    // Mark as optimized
    const metrics = this.componentMetrics.get(componentName);
    if (metrics) {
      metrics.optimized = true;
      metrics.memoized = optimizations.memo || false;
      this.componentMetrics.set(componentName, metrics);
    }

    return Component;
  }

  /**
   * Create lazy loading wrapper
   */
  static createLazyWrapper<T extends ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    fallback?: ReactNode
  ): ComponentType<T> {
    const LazyComponent = React.lazy(importFunc);
    
    return (props: any) => (
      <React.Suspense fallback={fallback || <div>Loading...</div>}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  }

  /**
   * Create error boundary for component optimization
   */
  static createErrorBoundary(
    Component: ComponentType<any>,
    fallback?: ReactNode
  ): ComponentType<any> {
    class OptimizedErrorBoundary extends React.Component<
      { children: ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        logger.error('Component error boundary caught error', { error: error.message });
        return { hasError: true };
      }

      componentDidCatch(error: Error, errorInfo: any) {
        logger.error('Component error boundary', { error: error.message, errorInfo });
      }

      render() {
        if (this.state.hasError) {
          return fallback || <div>Something went wrong.</div>;
        }

        return this.props.children;
      }
    }

    return (props: any) => (
      <OptimizedErrorBoundary>
        <Component {...props} />
      </OptimizedErrorBoundary>
    );
  }

  /**
   * Reset all metrics
   */
  static resetMetrics(): void {
    this.componentMetrics.clear();
    this.renderTimes.clear();
    logger.info('Component metrics reset');
  }

  /**
   * Export metrics for analysis
   */
  static exportMetrics(): {
    components: ComponentMetrics[];
    performance: {
      totalRenders: number;
      averageRenderTime: number;
      slowestComponent: string;
      mostRenderedComponent: string;
    };
  } {
    const allMetrics = Array.from(this.componentMetrics.values());
    const totalRenders = allMetrics.reduce((sum, m) => sum + m.renderCount, 0);
    const averageRenderTime = allMetrics.reduce((sum, m) => sum + m.averageRenderTime, 0) / allMetrics.length;
    
    const slowestComponent = allMetrics.reduce((slowest, current) => 
      current.averageRenderTime > slowest.averageRenderTime ? current : slowest
    ).name;
    
    const mostRenderedComponent = allMetrics.reduce((most, current) => 
      current.renderCount > most.renderCount ? current : most
    ).name;

    return {
      components: allMetrics,
      performance: {
        totalRenders,
        averageRenderTime: Math.round(averageRenderTime * 100) / 100,
        slowestComponent,
        mostRenderedComponent,
      },
    };
  }
}





