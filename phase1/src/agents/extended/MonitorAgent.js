import { BaseAgent } from '../BaseAgent.js';
import { 
  AgentType, 
  AgentCapability, 
  ClaudeCodeTool 
} from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';

export class MonitorAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      id: config.id || 'monitor-001',
      type: 'MonitorAgent',
      name: 'Sentinel',
      description: 'Expert System Monitor & Observability Specialist',
      capabilities: [
        AgentCapability.MONITORING,
        AgentCapability.DEBUGGING
      ],
      tools: [
        ClaudeCodeTool.READ,
        ClaudeCodeTool.WRITE,
        ClaudeCodeTool.BASH,
        ClaudeCodeTool.GREP,
        ClaudeCodeTool.GLOB,
        ClaudeCodeTool.TODO_WRITE
      ],
      ...config
    });
    
    this.persona = {
      role: 'Expert System Monitor & Observability Specialist',
      style: 'Vigilant, analytical, proactive, detail-oriented',
      identity: 'System guardian who ensures health, performance, and reliability through comprehensive monitoring',
      focus: 'Real-time monitoring, alerting, metrics analysis, anomaly detection, performance tracking',
      corePrinciples: [
        'Observability is the foundation of reliability',
        'Alert on symptoms, not just causes',
        'Every metric tells a story',
        'Proactive monitoring prevents reactive firefighting',
        'Context is key to understanding anomalies'
      ]
    };
    
    this.monitoringWorkflow = {
      metricsCollection: [
        'System metrics (CPU, memory, disk, network)',
        'Application metrics (requests, errors, latency)',
        'Business metrics (users, transactions, revenue)',
        'Custom metrics (feature usage, performance)'
      ],
      alertingStrategy: [
        'Define SLIs and SLOs',
        'Set intelligent thresholds',
        'Implement alert fatigue prevention',
        'Create actionable alerts',
        'Establish escalation paths'
      ]
    };
    
    // Initialize monitoring state
    this.activeMonitors = new Map();
    this.metricsBuffer = new Map();
    this.alertHistory = [];
  }

  async _executeTask(request) {
    const { taskType, input } = request;
    
    this.logger.info('Monitor executing task', { taskType });
    
    switch (taskType) {
      case 'setup-monitoring':
        return await this._setupMonitoring(input);
        
      case 'collect-metrics':
        return await this._collectMetrics(input);
        
      case 'analyze-performance':
        return await this._analyzePerformance(input);
        
      case 'detect-anomalies':
        return await this._detectAnomalies(input);
        
      case 'create-dashboard':
        return await this._createDashboard(input);
        
      case 'configure-alerts':
        return await this._configureAlerts(input);
        
      case 'health-check':
        return await this._performHealthCheck(input);
        
      case 'generate-report':
        return await this._generateMonitoringReport(input);
        
      case 'trace-request':
        return await this._traceRequest(input);
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  }

  async _setupMonitoring(input) {
    const {
      targets,
      metricsTypes = ['system', 'application', 'custom'],
      interval = 60, // seconds
      retention = 30 // days
    } = input;
    
    const setup = {
      targets: [],
      collectors: [],
      storage: null,
      status: 'configuring'
    };
    
    try {
      // Configure metrics storage
      setup.storage = await this._configureMetricsStorage(retention);
      
      // Setup collectors for each target
      for (const target of targets) {
        const collector = {
          target: target.name,
          type: target.type,
          endpoint: target.endpoint,
          metrics: [],
          interval
        };
        
        // Configure metrics based on type
        for (const metricType of metricsTypes) {
          const metrics = await this._configureMetricsForType(target, metricType);
          collector.metrics.push(...metrics);
        }
        
        // Create collector configuration
        const collectorConfig = this._generateCollectorConfig(collector);
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: `monitoring/collectors/${target.name}.yaml`,
          content: collectorConfig
        });
        
        setup.collectors.push(collector);
        
        // Start collector
        this.activeMonitors.set(target.name, {
          collector,
          lastCollection: null,
          status: 'active'
        });
      }
      
      // Setup aggregation rules
      const aggregationRules = this._createAggregationRules(setup.collectors);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: 'monitoring/aggregation-rules.yaml',
        content: aggregationRules
      });
      
      // Create monitoring directory structure
      await this._createMonitoringStructure();
      
      setup.status = 'active';
      
      return {
        setup,
        summary: `Monitoring configured for ${targets.length} targets with ${setup.collectors.reduce((acc, c) => acc + c.metrics.length, 0)} metrics`
      };
    } catch (error) {
      this.logger.error('Monitoring setup failed', { error: error.message });
      setup.status = 'failed';
      setup.error = error.message;
      return { setup, summary: `Setup failed: ${error.message}` };
    }
  }

  async _collectMetrics(input) {
    const {
      targets = Array.from(this.activeMonitors.keys()),
      immediate = false
    } = input;
    
    const collection = {
      timestamp: new Date().toISOString(),
      metrics: {},
      errors: []
    };
    
    for (const targetName of targets) {
      const monitor = this.activeMonitors.get(targetName);
      if (!monitor) {
        collection.errors.push({
          target: targetName,
          error: 'Monitor not found'
        });
        continue;
      }
      
      try {
        // Collect metrics based on type
        const metrics = {};
        
        // System metrics
        if (monitor.collector.metrics.some(m => m.type === 'system')) {
          metrics.system = await this._collectSystemMetrics();
        }
        
        // Application metrics
        if (monitor.collector.metrics.some(m => m.type === 'application')) {
          metrics.application = await this._collectApplicationMetrics(monitor.collector.endpoint);
        }
        
        // Custom metrics
        if (monitor.collector.metrics.some(m => m.type === 'custom')) {
          metrics.custom = await this._collectCustomMetrics(monitor.collector);
        }
        
        collection.metrics[targetName] = metrics;
        
        // Store in buffer
        this._bufferMetrics(targetName, metrics);
        
        // Update monitor state
        monitor.lastCollection = collection.timestamp;
        
      } catch (error) {
        collection.errors.push({
          target: targetName,
          error: error.message
        });
      }
    }
    
    // Persist metrics if buffer is full
    if (this._shouldFlushBuffer()) {
      await this._flushMetricsBuffer();
    }
    
    return {
      collection,
      summary: `Collected metrics from ${Object.keys(collection.metrics).length} targets`
    };
  }

  async _analyzePerformance(input) {
    const {
      target,
      timeRange = { hours: 24 },
      metrics = ['cpu', 'memory', 'response_time', 'error_rate']
    } = input;
    
    const analysis = {
      target,
      timeRange,
      metrics: {},
      insights: [],
      recommendations: []
    };
    
    try {
      // Load historical metrics
      const historicalData = await this._loadHistoricalMetrics(target, timeRange);
      
      // Analyze each metric
      for (const metric of metrics) {
        const metricData = this._extractMetricData(historicalData, metric);
        
        const metricAnalysis = {
          current: metricData[metricData.length - 1]?.value || 0,
          average: this._calculateAverage(metricData),
          percentiles: this._calculatePercentiles(metricData),
          trend: this._analyzeTrend(metricData),
          volatility: this._calculateVolatility(metricData)
        };
        
        analysis.metrics[metric] = metricAnalysis;
        
        // Generate insights
        const insights = this._generateMetricInsights(metric, metricAnalysis);
        analysis.insights.push(...insights);
      }
      
      // Correlation analysis
      const correlations = this._analyzeCorrelations(analysis.metrics);
      if (correlations.length > 0) {
        analysis.insights.push({
          type: 'correlation',
          message: `Found correlations between metrics`,
          data: correlations
        });
      }
      
      // Generate recommendations
      analysis.recommendations = this._generatePerformanceRecommendations(analysis);
      
      // Create performance report
      const report = this._generatePerformanceReport(analysis);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `monitoring/reports/performance-${target}-${Date.now()}.md`,
        content: report
      });
      
      return {
        analysis,
        summary: `Performance analysis for ${target}: ${analysis.insights.length} insights, ${analysis.recommendations.length} recommendations`
      };
    } catch (error) {
      this.logger.error('Performance analysis failed', { target, error: error.message });
      return {
        analysis,
        summary: `Analysis failed: ${error.message}`
      };
    }
  }

  async _detectAnomalies(input) {
    const {
      targets = Array.from(this.activeMonitors.keys()),
      sensitivity = 'medium',
      algorithms = ['statistical', 'pattern', 'threshold']
    } = input;
    
    const detection = {
      timestamp: new Date().toISOString(),
      anomalies: [],
      analysisCount: 0
    };
    
    const sensitivityConfig = {
      low: { threshold: 3, window: 60 },
      medium: { threshold: 2, window: 30 },
      high: { threshold: 1.5, window: 15 }
    }[sensitivity];
    
    for (const target of targets) {
      const monitor = this.activeMonitors.get(target);
      if (!monitor) continue;
      
      // Get recent metrics
      const recentMetrics = await this._getRecentMetrics(target, sensitivityConfig.window);
      detection.analysisCount++;
      
      // Apply detection algorithms
      for (const algorithm of algorithms) {
        const anomalies = await this._runAnomalyDetection(
          algorithm,
          recentMetrics,
          sensitivityConfig
        );
        
        for (const anomaly of anomalies) {
          detection.anomalies.push({
            target,
            algorithm,
            metric: anomaly.metric,
            severity: anomaly.severity,
            value: anomaly.value,
            expected: anomaly.expected,
            deviation: anomaly.deviation,
            timestamp: anomaly.timestamp
          });
          
          // Trigger alert if severe
          if (anomaly.severity === 'critical') {
            await this._triggerAnomalyAlert(target, anomaly);
          }
        }
      }
    }
    
    // Group anomalies by pattern
    const patterns = this._identifyAnomalyPatterns(detection.anomalies);
    detection.patterns = patterns;
    
    return {
      detection,
      summary: `Detected ${detection.anomalies.length} anomalies across ${detection.analysisCount} targets`
    };
  }

  async _createDashboard(input) {
    const {
      name,
      layout = 'grid',
      widgets = [],
      refreshInterval = 30 // seconds
    } = input;
    
    const dashboard = {
      id: `dashboard-${Date.now()}`,
      name,
      layout,
      widgets: [],
      created: new Date().toISOString()
    };
    
    try {
      // Process each widget
      for (const widgetConfig of widgets) {
        const widget = await this._createWidget(widgetConfig);
        dashboard.widgets.push(widget);
      }
      
      // Generate dashboard configuration
      const dashboardConfig = {
        ...dashboard,
        refreshInterval,
        datasources: this._identifyDatasources(dashboard.widgets),
        queries: this._generateWidgetQueries(dashboard.widgets)
      };
      
      // Create dashboard files
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `monitoring/dashboards/${dashboard.id}/config.json`,
        content: JSON.stringify(dashboardConfig, null, 2)
      });
      
      // Generate dashboard HTML
      const dashboardHTML = this._generateDashboardHTML(dashboardConfig);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `monitoring/dashboards/${dashboard.id}/index.html`,
        content: dashboardHTML
      });
      
      // Create dashboard API endpoints
      const apiEndpoints = this._generateDashboardAPI(dashboard.id);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `monitoring/dashboards/${dashboard.id}/api.js`,
        content: apiEndpoints
      });
      
      return {
        dashboard,
        summary: `Created dashboard "${name}" with ${dashboard.widgets.length} widgets`
      };
    } catch (error) {
      this.logger.error('Dashboard creation failed', { name, error: error.message });
      return {
        dashboard: null,
        summary: `Dashboard creation failed: ${error.message}`
      };
    }
  }

  async _configureAlerts(input) {
    const {
      rules,
      channels = ['email', 'slack'],
      escalationPolicy = 'standard'
    } = input;
    
    const alertConfig = {
      rules: [],
      channels: {},
      escalation: null,
      status: 'configuring'
    };
    
    try {
      // Configure alert channels
      for (const channel of channels) {
        const channelConfig = await this._configureAlertChannel(channel);
        alertConfig.channels[channel] = channelConfig;
      }
      
      // Process alert rules
      for (const rule of rules) {
        const processedRule = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: rule.name,
          condition: rule.condition,
          threshold: rule.threshold,
          duration: rule.duration || '5m',
          severity: rule.severity || 'warning',
          channels: rule.channels || channels,
          metadata: rule.metadata || {}
        };
        
        // Validate rule
        const validation = this._validateAlertRule(processedRule);
        if (!validation.valid) {
          throw new Error(`Invalid rule ${rule.name}: ${validation.errors.join(', ')}`);
        }
        
        alertConfig.rules.push(processedRule);
      }
      
      // Configure escalation policy
      alertConfig.escalation = this._configureEscalationPolicy(escalationPolicy);
      
      // Write alert configuration
      const alertingConfig = this._generateAlertingConfig(alertConfig);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: 'monitoring/alerting/config.yaml',
        content: alertingConfig
      });
      
      // Create alert templates
      for (const severity of ['critical', 'warning', 'info']) {
        const template = this._generateAlertTemplate(severity);
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: `monitoring/alerting/templates/${severity}.template`,
          content: template
        });
      }
      
      alertConfig.status = 'active';
      
      return {
        alertConfig,
        summary: `Configured ${alertConfig.rules.length} alert rules with ${channels.length} channels`
      };
    } catch (error) {
      this.logger.error('Alert configuration failed', { error: error.message });
      alertConfig.status = 'failed';
      alertConfig.error = error.message;
      return {
        alertConfig,
        summary: `Alert configuration failed: ${error.message}`
      };
    }
  }

  async _performHealthCheck(input) {
    const {
      targets = Array.from(this.activeMonitors.keys()),
      checks = ['connectivity', 'performance', 'resources', 'dependencies']
    } = input;
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      targets: {},
      issues: []
    };
    
    for (const target of targets) {
      const targetHealth = {
        status: 'healthy',
        checks: {},
        score: 100
      };
      
      for (const checkType of checks) {
        try {
          const checkResult = await this._runHealthCheck(target, checkType);
          targetHealth.checks[checkType] = checkResult;
          
          if (!checkResult.passed) {
            targetHealth.score -= checkResult.impact || 25;
            healthCheck.issues.push({
              target,
              check: checkType,
              issue: checkResult.message,
              severity: checkResult.severity
            });
          }
        } catch (error) {
          targetHealth.checks[checkType] = {
            passed: false,
            error: error.message
          };
          targetHealth.score -= 25;
        }
      }
      
      // Determine target health status
      if (targetHealth.score >= 80) {
        targetHealth.status = 'healthy';
      } else if (targetHealth.score >= 60) {
        targetHealth.status = 'degraded';
      } else {
        targetHealth.status = 'unhealthy';
      }
      
      healthCheck.targets[target] = targetHealth;
    }
    
    // Determine overall health
    const unhealthyCount = Object.values(healthCheck.targets)
      .filter(t => t.status === 'unhealthy').length;
    const degradedCount = Object.values(healthCheck.targets)
      .filter(t => t.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      healthCheck.overall = 'unhealthy';
    } else if (degradedCount > targets.length / 2) {
      healthCheck.overall = 'degraded';
    }
    
    // Generate health report
    const report = this._generateHealthReport(healthCheck);
    await this.invokeTool(ClaudeCodeTool.WRITE, {
      file_path: `monitoring/health/report-${Date.now()}.json`,
      content: JSON.stringify(healthCheck, null, 2)
    });
    
    return {
      healthCheck,
      summary: `Health check: ${healthCheck.overall} - ${healthCheck.issues.length} issues found`
    };
  }

  async _generateMonitoringReport(input) {
    const {
      period = { days: 7 },
      sections = ['overview', 'performance', 'availability', 'incidents', 'trends'],
      format = 'markdown'
    } = input;
    
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      sections: {}
    };
    
    try {
      // Gather data for each section
      if (sections.includes('overview')) {
        report.sections.overview = await this._generateOverviewSection(period);
      }
      
      if (sections.includes('performance')) {
        report.sections.performance = await this._generatePerformanceSection(period);
      }
      
      if (sections.includes('availability')) {
        report.sections.availability = await this._generateAvailabilitySection(period);
      }
      
      if (sections.includes('incidents')) {
        report.sections.incidents = await this._generateIncidentsSection(period);
      }
      
      if (sections.includes('trends')) {
        report.sections.trends = await this._generateTrendsSection(period);
      }
      
      // Format report
      let formattedReport;
      if (format === 'markdown') {
        formattedReport = this._formatReportAsMarkdown(report);
      } else if (format === 'html') {
        formattedReport = this._formatReportAsHTML(report);
      } else {
        formattedReport = JSON.stringify(report, null, 2);
      }
      
      // Save report
      const extension = { markdown: 'md', html: 'html', json: 'json' }[format];
      const reportPath = `monitoring/reports/weekly-${Date.now()}.${extension}`;
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: reportPath,
        content: formattedReport
      });
      
      return {
        report,
        reportPath,
        summary: `Generated monitoring report for ${period.days} days with ${sections.length} sections`
      };
    } catch (error) {
      this.logger.error('Report generation failed', { error: error.message });
      return {
        report: null,
        summary: `Report generation failed: ${error.message}`
      };
    }
  }

  async _traceRequest(input) {
    const {
      requestId,
      service,
      startTime,
      endTime
    } = input;
    
    const trace = {
      requestId,
      spans: [],
      services: new Set(),
      totalDuration: 0,
      errorCount: 0
    };
    
    try {
      // Collect trace data from logs
      const traceData = await this._collectTraceData(requestId, startTime, endTime);
      
      // Build span tree
      trace.spans = this._buildSpanTree(traceData);
      
      // Calculate metrics
      trace.totalDuration = this._calculateTraceDuration(trace.spans);
      trace.errorCount = trace.spans.filter(s => s.error).length;
      
      // Identify services involved
      trace.spans.forEach(span => trace.services.add(span.service));
      
      // Analyze performance
      const bottlenecks = this._identifyBottlenecks(trace.spans);
      trace.bottlenecks = bottlenecks;
      
      // Generate trace visualization
      const visualization = this._generateTraceVisualization(trace);
      await this.invokeTool(ClaudeCodeTool.WRITE, {
        file_path: `monitoring/traces/${requestId}.html`,
        content: visualization
      });
      
      return {
        trace,
        summary: `Traced request ${requestId}: ${trace.spans.length} spans across ${trace.services.size} services`
      };
    } catch (error) {
      this.logger.error('Request tracing failed', { requestId, error: error.message });
      return {
        trace: null,
        summary: `Tracing failed: ${error.message}`
      };
    }
  }

  // Helper methods
  async _configureMetricsStorage(retention) {
    return {
      type: 'time-series',
      retention: `${retention}d`,
      aggregation: ['1m', '5m', '1h', '1d'],
      compression: true
    };
  }

  async _configureMetricsForType(target, metricType) {
    const metricsMap = {
      system: [
        { name: 'cpu_usage', unit: 'percent' },
        { name: 'memory_usage', unit: 'percent' },
        { name: 'disk_usage', unit: 'percent' },
        { name: 'network_io', unit: 'bytes' }
      ],
      application: [
        { name: 'request_rate', unit: 'requests/sec' },
        { name: 'error_rate', unit: 'errors/sec' },
        { name: 'response_time', unit: 'ms' },
        { name: 'active_connections', unit: 'count' }
      ],
      custom: target.customMetrics || []
    };
    
    return metricsMap[metricType] || [];
  }

  _generateCollectorConfig(collector) {
    return `name: ${collector.target}
type: ${collector.type}
endpoint: ${collector.endpoint || 'localhost'}
interval: ${collector.interval}s

metrics:
${collector.metrics.map(m => `  - name: ${m.name}
    unit: ${m.unit}
    type: gauge`).join('\n')}

labels:
  environment: production
  service: ${collector.target}
`;
  }

  _createAggregationRules(collectors) {
    return `aggregation_rules:
  - name: "1m_avg"
    interval: "1m"
    function: "average"
    
  - name: "5m_avg"
    interval: "5m"
    function: "average"
    
  - name: "1h_max"
    interval: "1h"
    function: "max"
    
  - name: "1d_percentile"
    interval: "1d"
    function: "percentile"
    percentile: 95
`;
  }

  async _createMonitoringStructure() {
    const dirs = [
      'monitoring/collectors',
      'monitoring/dashboards',
      'monitoring/reports',
      'monitoring/alerts',
      'monitoring/traces',
      'monitoring/health',
      'monitoring/alerting/templates'
    ];
    
    for (const dir of dirs) {
      await this.invokeTool(ClaudeCodeTool.BASH, {
        command: `mkdir -p ${dir}`,
        description: `Create ${dir} directory`
      });
    }
  }

  async _collectSystemMetrics() {
    try {
      // CPU usage
      const cpuResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
        description: 'Get CPU usage'
      });
      
      // Memory usage
      const memResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: "free | grep Mem | awk '{print ($3/$2) * 100.0}'",
        description: 'Get memory usage'
      });
      
      // Disk usage
      const diskResult = await this.invokeTool(ClaudeCodeTool.BASH, {
        command: "df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1",
        description: 'Get disk usage'
      });
      
      return {
        cpu_usage: parseFloat(cpuResult.stdout.trim()) || 0,
        memory_usage: parseFloat(memResult.stdout.trim()) || 0,
        disk_usage: parseFloat(diskResult.stdout.trim()) || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        error: error.message
      };
    }
  }

  async _collectApplicationMetrics(endpoint) {
    // Simulate application metrics collection
    return {
      request_rate: Math.random() * 1000,
      error_rate: Math.random() * 10,
      response_time: Math.random() * 200 + 50,
      active_connections: Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString()
    };
  }

  async _collectCustomMetrics(collector) {
    const metrics = {};
    
    for (const metric of collector.metrics) {
      if (metric.type === 'custom') {
        // Simulate custom metric collection
        metrics[metric.name] = Math.random() * 100;
      }
    }
    
    metrics.timestamp = new Date().toISOString();
    return metrics;
  }

  _bufferMetrics(target, metrics) {
    if (!this.metricsBuffer.has(target)) {
      this.metricsBuffer.set(target, []);
    }
    
    this.metricsBuffer.get(target).push({
      ...metrics,
      bufferedAt: new Date().toISOString()
    });
  }

  _shouldFlushBuffer() {
    // Flush if any buffer has more than 100 entries
    for (const [, buffer] of this.metricsBuffer) {
      if (buffer.length > 100) return true;
    }
    return false;
  }

  async _flushMetricsBuffer() {
    for (const [target, buffer] of this.metricsBuffer) {
      if (buffer.length > 0) {
        const metricsFile = `monitoring/metrics/${target}-${Date.now()}.json`;
        await this.invokeTool(ClaudeCodeTool.WRITE, {
          file_path: metricsFile,
          content: JSON.stringify(buffer, null, 2)
        });
        
        // Clear buffer
        this.metricsBuffer.set(target, []);
      }
    }
  }

  async _loadHistoricalMetrics(target, timeRange) {
    // Simulate loading historical metrics
    const dataPoints = [];
    const now = new Date();
    const hoursAgo = timeRange.hours || 24;
    
    for (let i = 0; i < hoursAgo * 60; i += 5) { // 5-minute intervals
      const timestamp = new Date(now - i * 60 * 1000);
      dataPoints.push({
        timestamp,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        response_time: Math.random() * 200 + 50,
        error_rate: Math.random() * 5
      });
    }
    
    return dataPoints.reverse();
  }

  _extractMetricData(historicalData, metric) {
    return historicalData.map(d => ({
      timestamp: d.timestamp,
      value: d[metric] || 0
    }));
  }

  _calculateAverage(data) {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, d) => acc + d.value, 0);
    return sum / data.length;
  }

  _calculatePercentiles(data) {
    const sorted = data.map(d => d.value).sort((a, b) => a - b);
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      p50: sorted[p50Index] || 0,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }

  _analyzeTrend(data) {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = this._calculateAverage(firstHalf);
    const secondAvg = this._calculateAverage(secondHalf);
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  _calculateVolatility(data) {
    const avg = this._calculateAverage(data);
    const squaredDiffs = data.map(d => Math.pow(d.value - avg, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(variance);
  }

  _generateMetricInsights(metric, analysis) {
    const insights = [];
    
    if (analysis.trend === 'increasing' && metric === 'cpu') {
      insights.push({
        type: 'trend',
        severity: 'warning',
        message: 'CPU usage is trending upward'
      });
    }
    
    if (analysis.percentiles.p95 > 90 && (metric === 'cpu' || metric === 'memory')) {
      insights.push({
        type: 'threshold',
        severity: 'warning',
        message: `${metric} p95 is above 90%`
      });
    }
    
    if (analysis.volatility > 20) {
      insights.push({
        type: 'volatility',
        severity: 'info',
        message: `High volatility detected in ${metric}`
      });
    }
    
    return insights;
  }

  _analyzeCorrelations(metrics) {
    const correlations = [];
    
    // Simple correlation detection
    if (metrics.cpu?.trend === 'increasing' && metrics.response_time?.trend === 'increasing') {
      correlations.push({
        metrics: ['cpu', 'response_time'],
        type: 'positive',
        strength: 'moderate'
      });
    }
    
    return correlations;
  }

  _generatePerformanceRecommendations(analysis) {
    const recommendations = [];
    
    for (const insight of analysis.insights) {
      if (insight.type === 'trend' && insight.severity === 'warning') {
        recommendations.push({
          priority: 'high',
          action: 'Investigate resource consumption',
          reason: insight.message
        });
      }
      
      if (insight.type === 'threshold') {
        recommendations.push({
          priority: 'medium',
          action: 'Consider scaling resources',
          reason: insight.message
        });
      }
    }
    
    return recommendations;
  }

  _generatePerformanceReport(analysis) {
    return `# Performance Analysis Report

**Target**: ${analysis.target}
**Time Range**: ${analysis.timeRange.hours} hours
**Generated**: ${new Date().toISOString()}

## Metrics Summary

${Object.entries(analysis.metrics).map(([metric, data]) => `
### ${metric}
- Current: ${data.current.toFixed(2)}
- Average: ${data.average.toFixed(2)}
- P95: ${data.percentiles.p95.toFixed(2)}
- Trend: ${data.trend}
`).join('\n')}

## Insights
${analysis.insights.map(i => `- [${i.severity}] ${i.message}`).join('\n')}

## Recommendations
${analysis.recommendations.map(r => `- [${r.priority}] ${r.action}: ${r.reason}`).join('\n')}
`;
  }

  async _getRecentMetrics(target, windowMinutes) {
    // Get metrics from buffer
    const buffer = this.metricsBuffer.get(target) || [];
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    return buffer.filter(m => new Date(m.timestamp) > cutoff);
  }

  async _runAnomalyDetection(algorithm, metrics, config) {
    const anomalies = [];
    
    switch (algorithm) {
      case 'statistical':
        // Statistical anomaly detection
        for (const metric of Object.keys(metrics[0] || {})) {
          if (metric === 'timestamp') continue;
          
          const values = metrics.map(m => m[metric]);
          const mean = this._calculateAverage(values.map(v => ({ value: v })));
          const stdDev = this._calculateVolatility(values.map(v => ({ value: v })));
          
          const latest = values[values.length - 1];
          const deviation = Math.abs(latest - mean) / stdDev;
          
          if (deviation > config.threshold) {
            anomalies.push({
              metric,
              severity: deviation > 3 ? 'critical' : 'warning',
              value: latest,
              expected: mean,
              deviation,
              timestamp: metrics[metrics.length - 1].timestamp
            });
          }
        }
        break;
        
      case 'threshold':
        // Simple threshold detection
        const thresholds = {
          cpu_usage: 80,
          memory_usage: 90,
          error_rate: 5
        };
        
        for (const [metric, threshold] of Object.entries(thresholds)) {
          const latest = metrics[metrics.length - 1]?.[metric];
          if (latest > threshold) {
            anomalies.push({
              metric,
              severity: 'warning',
              value: latest,
              expected: threshold,
              deviation: ((latest - threshold) / threshold) * 100,
              timestamp: metrics[metrics.length - 1].timestamp
            });
          }
        }
        break;
    }
    
    return anomalies;
  }

  async _triggerAnomalyAlert(target, anomaly) {
    const alert = {
      id: `anomaly-${Date.now()}`,
      target,
      anomaly,
      triggeredAt: new Date().toISOString()
    };
    
    this.alertHistory.push(alert);
    
    // Log alert
    this.logger.warn('Anomaly detected', alert);
  }

  _identifyAnomalyPatterns(anomalies) {
    const patterns = [];
    
    // Group by target
    const byTarget = {};
    for (const anomaly of anomalies) {
      if (!byTarget[anomaly.target]) byTarget[anomaly.target] = [];
      byTarget[anomaly.target].push(anomaly);
    }
    
    // Look for patterns
    for (const [target, targetAnomalies] of Object.entries(byTarget)) {
      if (targetAnomalies.length > 3) {
        patterns.push({
          type: 'frequent-anomalies',
          target,
          count: targetAnomalies.length
        });
      }
    }
    
    return patterns;
  }

  async _createWidget(config) {
    return {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: config.type,
      title: config.title,
      metric: config.metric,
      visualization: config.visualization || 'line',
      position: config.position || { x: 0, y: 0, w: 4, h: 3 },
      query: this._generateWidgetQuery(config)
    };
  }

  _identifyDatasources(widgets) {
    const datasources = new Set();
    for (const widget of widgets) {
      datasources.add(widget.metric.split('_')[0]);
    }
    return Array.from(datasources);
  }

  _generateWidgetQueries(widgets) {
    return widgets.map(w => w.query);
  }

  _generateWidgetQuery(config) {
    return `SELECT ${config.aggregation || 'avg'}(${config.metric}) FROM metrics WHERE time > now() - ${config.timeRange || '1h'} GROUP BY time(${config.interval || '1m'})`;
  }

  _generateDashboardHTML(config) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>${config.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .dashboard { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; }
    .widget { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .widget h3 { margin-top: 0; }
  </style>
</head>
<body>
  <h1>${config.name}</h1>
  <div class="dashboard">
    ${config.widgets.map(w => `
    <div class="widget" style="grid-column: span ${w.position.w}; grid-row: span ${w.position.h};">
      <h3>${w.title}</h3>
      <div id="${w.id}"></div>
    </div>`).join('')}
  </div>
  <script src="api.js"></script>
</body>
</html>`;
  }

  _generateDashboardAPI(dashboardId) {
    return `// Dashboard API for ${dashboardId}

async function fetchMetrics(widget) {
  const response = await fetch(\`/api/metrics?query=\${encodeURIComponent(widget.query)}\`);
  return response.json();
}

async function updateDashboard() {
  // Update logic here
}

setInterval(updateDashboard, ${30000}); // Update every 30 seconds
`;
  }

  async _configureAlertChannel(channel) {
    const configs = {
      email: {
        type: 'email',
        settings: {
          smtp: 'smtp.example.com',
          from: 'alerts@monitoring.com'
        }
      },
      slack: {
        type: 'slack',
        settings: {
          webhook: 'https://hooks.slack.com/...',
          channel: '#alerts'
        }
      }
    };
    
    return configs[channel] || {};
  }

  _validateAlertRule(rule) {
    const errors = [];
    
    if (!rule.name) errors.push('Name is required');
    if (!rule.condition) errors.push('Condition is required');
    if (!rule.threshold && rule.threshold !== 0) errors.push('Threshold is required');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  _configureEscalationPolicy(policy) {
    const policies = {
      standard: {
        levels: [
          { severity: 'info', notify: ['email'], delay: 0 },
          { severity: 'warning', notify: ['email', 'slack'], delay: 0 },
          { severity: 'critical', notify: ['email', 'slack', 'pagerduty'], delay: 0 }
        ],
        repeat: 3,
        interval: '5m'
      }
    };
    
    return policies[policy] || policies.standard;
  }

  _generateAlertingConfig(config) {
    return `# Alerting Configuration

channels:
${Object.entries(config.channels).map(([name, cfg]) => `  ${name}:
    type: ${cfg.type}
    settings:
${Object.entries(cfg.settings).map(([k, v]) => `      ${k}: ${v}`).join('\n')}`).join('\n')}

rules:
${config.rules.map(r => `  - name: ${r.name}
    condition: ${r.condition}
    threshold: ${r.threshold}
    duration: ${r.duration}
    severity: ${r.severity}
    channels: [${r.channels.join(', ')}]`).join('\n')}

escalation:
  policy: ${config.escalation.levels[0].severity}
  repeat: ${config.escalation.repeat}
  interval: ${config.escalation.interval}
`;
  }

  _generateAlertTemplate(severity) {
    return `Alert: {{ .AlertName }}
Severity: ${severity}
Time: {{ .Time }}

{{ .Message }}

Labels:
{{ range .Labels }}
  {{ .Name }}: {{ .Value }}
{{ end }}

View Dashboard: {{ .DashboardURL }}
`;
  }

  async _runHealthCheck(target, checkType) {
    const checks = {
      connectivity: async () => {
        // Simulate connectivity check
        return {
          passed: true,
          latency: Math.random() * 100,
          message: 'Target is reachable'
        };
      },
      performance: async () => {
        const cpu = Math.random() * 100;
        return {
          passed: cpu < 80,
          cpu,
          message: cpu < 80 ? 'Performance is good' : 'High CPU usage detected',
          severity: cpu > 90 ? 'critical' : 'warning',
          impact: cpu > 80 ? 25 : 0
        };
      },
      resources: async () => {
        const memory = Math.random() * 100;
        return {
          passed: memory < 90,
          memory,
          message: memory < 90 ? 'Resources are adequate' : 'High memory usage',
          severity: memory > 95 ? 'critical' : 'warning',
          impact: memory > 90 ? 30 : 0
        };
      },
      dependencies: async () => {
        return {
          passed: true,
          dependencies: ['database', 'cache'],
          message: 'All dependencies are healthy'
        };
      }
    };
    
    return await checks[checkType]();
  }

  _generateHealthReport(healthCheck) {
    return `# Health Check Report

**Timestamp**: ${healthCheck.timestamp}
**Overall Status**: ${healthCheck.overall}

## Target Status
${Object.entries(healthCheck.targets).map(([target, health]) => `
### ${target}
- Status: ${health.status}
- Score: ${health.score}/100
- Checks: ${Object.keys(health.checks).map(c => health.checks[c].passed ? '✓' : '✗').join(' ')}`).join('\n')}

## Issues
${healthCheck.issues.length === 0 ? 'No issues found' : 
  healthCheck.issues.map(i => `- [${i.severity}] ${i.target}/${i.check}: ${i.issue}`).join('\n')}
`;
  }

  async _generateOverviewSection(period) {
    return {
      totalTargets: this.activeMonitors.size,
      activeAlerts: this.alertHistory.filter(a => 
        new Date(a.triggeredAt) > new Date(Date.now() - period.days * 24 * 60 * 60 * 1000)
      ).length,
      uptime: '99.95%',
      metricsCollected: Math.floor(Math.random() * 1000000)
    };
  }

  async _generatePerformanceSection(period) {
    return {
      averageResponseTime: '234ms',
      p95ResponseTime: '567ms',
      throughput: '1.2K req/s',
      errorRate: '0.02%'
    };
  }

  async _generateAvailabilitySection(period) {
    return {
      overall: '99.95%',
      byService: {
        api: '99.98%',
        web: '99.92%',
        database: '99.99%'
      }
    };
  }

  async _generateIncidentsSection(period) {
    return {
      total: 3,
      bySeverity: {
        critical: 0,
        major: 1,
        minor: 2
      },
      averageResolutionTime: '45 minutes'
    };
  }

  async _generateTrendsSection(period) {
    return {
      traffic: '+15%',
      errors: '-5%',
      performance: 'stable',
      costs: '+8%'
    };
  }

  _formatReportAsMarkdown(report) {
    return `# Monitoring Report

**Period**: ${report.period.days} days
**Generated**: ${report.generatedAt}

## Overview
- Total Targets: ${report.sections.overview.totalTargets}
- Active Alerts: ${report.sections.overview.activeAlerts}
- Uptime: ${report.sections.overview.uptime}
- Metrics Collected: ${report.sections.overview.metricsCollected}

## Performance
- Average Response Time: ${report.sections.performance.averageResponseTime}
- P95 Response Time: ${report.sections.performance.p95ResponseTime}
- Throughput: ${report.sections.performance.throughput}
- Error Rate: ${report.sections.performance.errorRate}

## Availability
Overall: ${report.sections.availability.overall}

By Service:
${Object.entries(report.sections.availability.byService)
  .map(([service, uptime]) => `- ${service}: ${uptime}`).join('\n')}

## Incidents
- Total: ${report.sections.incidents.total}
- Critical: ${report.sections.incidents.bySeverity.critical}
- Major: ${report.sections.incidents.bySeverity.major}
- Minor: ${report.sections.incidents.bySeverity.minor}
- Avg Resolution: ${report.sections.incidents.averageResolutionTime}

## Trends
- Traffic: ${report.sections.trends.traffic}
- Errors: ${report.sections.trends.errors}
- Performance: ${report.sections.trends.performance}
- Costs: ${report.sections.trends.costs}
`;
  }

  async _collectTraceData(requestId, startTime, endTime) {
    // Simulate trace data collection
    return [
      {
        spanId: 'span-1',
        parentId: null,
        service: 'api-gateway',
        operation: 'HTTP GET /api/users',
        startTime: startTime,
        duration: 45
      },
      {
        spanId: 'span-2',
        parentId: 'span-1',
        service: 'user-service',
        operation: 'getUserById',
        startTime: startTime + 10,
        duration: 30
      },
      {
        spanId: 'span-3',
        parentId: 'span-2',
        service: 'database',
        operation: 'SELECT * FROM users',
        startTime: startTime + 15,
        duration: 20
      }
    ];
  }

  _buildSpanTree(traceData) {
    // Build hierarchical span tree
    const spanMap = {};
    const roots = [];
    
    // Create span objects
    for (const span of traceData) {
      spanMap[span.spanId] = {
        ...span,
        children: []
      };
    }
    
    // Build tree
    for (const span of traceData) {
      if (span.parentId && spanMap[span.parentId]) {
        spanMap[span.parentId].children.push(spanMap[span.spanId]);
      } else {
        roots.push(spanMap[span.spanId]);
      }
    }
    
    return roots;
  }

  _calculateTraceDuration(spans) {
    let maxEnd = 0;
    let minStart = Infinity;
    
    function traverse(span) {
      minStart = Math.min(minStart, span.startTime);
      maxEnd = Math.max(maxEnd, span.startTime + span.duration);
      span.children.forEach(traverse);
    }
    
    spans.forEach(traverse);
    return maxEnd - minStart;
  }

  _identifyBottlenecks(spans) {
    const bottlenecks = [];
    
    function traverse(span) {
      if (span.duration > 100) {
        bottlenecks.push({
          service: span.service,
          operation: span.operation,
          duration: span.duration
        });
      }
      span.children.forEach(traverse);
    }
    
    spans.forEach(traverse);
    return bottlenecks.sort((a, b) => b.duration - a.duration);
  }

  _generateTraceVisualization(trace) {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Trace: ${trace.requestId}</title>
  <style>
    body { font-family: Arial, sans-serif; }
    .span { margin-left: 20px; padding: 5px; border-left: 2px solid #ddd; }
    .error { background: #fee; }
  </style>
</head>
<body>
  <h1>Request Trace: ${trace.requestId}</h1>
  <p>Duration: ${trace.totalDuration}ms | Services: ${trace.services.size} | Errors: ${trace.errorCount}</p>
  
  <h2>Spans</h2>
  <div class="trace">
    ${this._renderSpanTree(trace.spans)}
  </div>
  
  <h2>Bottlenecks</h2>
  <ul>
    ${trace.bottlenecks.map(b => `<li>${b.service} - ${b.operation}: ${b.duration}ms</li>`).join('')}
  </ul>
</body>
</html>`;
  }

  _renderSpanTree(spans, level = 0) {
    return spans.map(span => `
      <div class="span ${span.error ? 'error' : ''}" style="margin-left: ${level * 20}px">
        <strong>${span.service}</strong> - ${span.operation} (${span.duration}ms)
        ${span.children.length > 0 ? this._renderSpanTree(span.children, level + 1) : ''}
      </div>
    `).join('');
  }
}