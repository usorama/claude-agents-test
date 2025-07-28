import fs from 'fs/promises';
import path from 'path';

export class PerformanceDashboard {
  constructor(performanceMonitor, options = {}) {
    this.monitor = performanceMonitor;
    this.options = {
      updateInterval: options.updateInterval || 5000,
      port: options.port || 3001,
      enableRealTime: options.enableRealTime !== false,
      maxDataPoints: options.maxDataPoints || 100,
      ...options
    };
    
    this.dashboardData = {
      lastUpdate: null,
      summary: null,
      charts: {},
      alerts: []
    };
    
    this.clients = new Set();
    this.updateTimer = null;
  }

  async generateDashboard() {
    const summary = this.monitor.getPerformanceSummary();
    const timestamp = new Date().toISOString();
    
    this.dashboardData = {
      lastUpdate: timestamp,
      summary,
      charts: await this._generateChartData(),
      alerts: Array.from(this.monitor.activeAlerts.values())
    };
    
    const html = await this._generateHTML();
    const css = this._generateCSS();
    const js = await this._generateJavaScript();
    
    return {
      html,
      css,
      js,
      data: this.dashboardData
    };
  }

  async saveDashboard(outputDir = './monitoring/dashboard') {
    const dashboard = await this.generateDashboard();
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write files
    await fs.writeFile(
      path.join(outputDir, 'index.html'),
      dashboard.html
    );
    
    await fs.writeFile(
      path.join(outputDir, 'styles.css'),
      dashboard.css
    );
    
    await fs.writeFile(
      path.join(outputDir, 'dashboard.js'),
      dashboard.js
    );
    
    await fs.writeFile(
      path.join(outputDir, 'data.json'),
      JSON.stringify(dashboard.data, null, 2)
    );
    
    return outputDir;
  }

  async startRealTimeDashboard() {
    if (!this.options.enableRealTime) {
      throw new Error('Real-time dashboard is disabled');
    }
    
    // Start periodic updates
    this.updateTimer = setInterval(
      () => this._updateDashboardData(),
      this.options.updateInterval
    );
    
    // Listen for monitor events
    this.monitor.on('metrics:collected', (data) => {
      this._broadcastUpdate('metrics', data);
    });
    
    this.monitor.on('alert:triggered', (alert) => {
      this._broadcastUpdate('alert', alert);
    });
    
    this.monitor.on('agent:task:completed', (data) => {
      this._broadcastUpdate('task', data);
    });
  }

  stopRealTimeDashboard() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.monitor.removeAllListeners();
    this.clients.clear();
  }

  // Private methods
  async _generateChartData() {
    const systemMetrics = this.monitor.getSystemMetrics();
    const agentMetrics = this.monitor.getAllAgentMetrics();
    
    return {
      systemOverview: {
        type: 'line',
        title: 'System Performance',
        data: {
          labels: this._generateTimeLabels(),
          datasets: [
            {
              label: 'CPU Usage (%)',
              data: this.monitor.metrics.system.cpu.slice(-this.options.maxDataPoints),
              borderColor: '#ff6b6b',
              backgroundColor: 'rgba(255, 107, 107, 0.1)'
            },
            {
              label: 'Memory Usage (%)',
              data: this.monitor.metrics.system.memory.slice(-this.options.maxDataPoints),
              borderColor: '#4ecdc4',
              backgroundColor: 'rgba(78, 205, 196, 0.1)'
            }
          ]
        }
      },
      
      agentPerformance: {
        type: 'bar',
        title: 'Agent Response Times',
        data: {
          labels: Object.keys(agentMetrics),
          datasets: [{
            label: 'Avg Response Time (ms)',
            data: Object.values(agentMetrics).map(a => a.performance.averageResponseTime),
            backgroundColor: Object.values(agentMetrics).map(a => 
              a.health.score > 80 ? '#51cf66' : 
              a.health.score > 60 ? '#ffd43b' : '#ff6b6b'
            )
          }]
        }
      },
      
      taskThroughput: {
        type: 'doughnut',
        title: 'Task Status Distribution',
        data: {
          labels: ['Completed', 'Failed', 'In Progress'],
          datasets: [{
            data: [
              Object.values(agentMetrics).reduce((sum, a) => sum + a.tasks.completed, 0),
              Object.values(agentMetrics).reduce((sum, a) => sum + a.tasks.failed, 0),
              Object.values(agentMetrics).reduce((sum, a) => sum + a.tasks.total - a.tasks.completed - a.tasks.failed, 0)
            ],
            backgroundColor: ['#51cf66', '#ff6b6b', '#ffd43b']
          }]
        }
      },
      
      agentHealth: {
        type: 'radar',
        title: 'Agent Health Scores',
        data: {
          labels: Object.keys(agentMetrics),
          datasets: [{
            label: 'Health Score',
            data: Object.values(agentMetrics).map(a => a.health.score),
            backgroundColor: 'rgba(78, 205, 196, 0.2)',
            borderColor: '#4ecdc4',
            pointBackgroundColor: '#4ecdc4'
          }]
        }
      }
    };
  }

  _generateTimeLabels() {
    const labels = [];
    const now = Date.now();
    
    for (let i = this.options.maxDataPoints - 1; i >= 0; i--) {
      const time = new Date(now - (i * this.options.updateInterval));
      labels.push(time.toLocaleTimeString());
    }
    
    return labels;
  }

  async _generateHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IronClaude-S Performance Dashboard</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/date-fns@2.29.3/index.min.js"></script>
</head>
<body>
    <div class="dashboard">
        <header class="dashboard-header">
            <h1>IronClaude-S Performance Dashboard</h1>
            <div class="header-stats">
                <div class="stat">
                    <label>System Status</label>
                    <span id="system-status" class="status-indicator">Loading...</span>
                </div>
                <div class="stat">
                    <label>Active Agents</label>
                    <span id="active-agents">-</span>
                </div>
                <div class="stat">
                    <label>Active Alerts</label>
                    <span id="active-alerts" class="alert-count">-</span>
                </div>
                <div class="stat">
                    <label>Last Update</label>
                    <span id="last-update">-</span>
                </div>
            </div>
        </header>

        <div class="dashboard-grid">
            <!-- System Overview -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>System Performance</h3>
                    <div class="card-controls">
                        <button class="btn-refresh" onclick="refreshChart('systemOverview')">↻</button>
                    </div>
                </div>
                <div class="card-content">
                    <canvas id="systemOverviewChart"></canvas>
                </div>
            </div>

            <!-- Agent Performance -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Agent Response Times</h3>
                    <div class="card-controls">
                        <button class="btn-refresh" onclick="refreshChart('agentPerformance')">↻</button>
                    </div>
                </div>
                <div class="card-content">
                    <canvas id="agentPerformanceChart"></canvas>
                </div>
            </div>

            <!-- Task Throughput -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Task Distribution</h3>
                    <div class="card-controls">
                        <button class="btn-refresh" onclick="refreshChart('taskThroughput')">↻</button>
                    </div>
                </div>
                <div class="card-content">
                    <canvas id="taskThroughputChart"></canvas>
                </div>
            </div>

            <!-- Agent Health -->
            <div class="dashboard-card">
                <div class="card-header">
                    <h3>Agent Health</h3>
                    <div class="card-controls">
                        <button class="btn-refresh" onclick="refreshChart('agentHealth')">↻</button>
                    </div>
                </div>
                <div class="card-content">
                    <canvas id="agentHealthChart"></canvas>
                </div>
            </div>

            <!-- Agent Details -->
            <div class="dashboard-card full-width">
                <div class="card-header">
                    <h3>Agent Details</h3>
                    <div class="card-controls">
                        <select id="agent-filter" onchange="filterAgents()">
                            <option value="">All Agents</option>
                        </select>
                    </div>
                </div>
                <div class="card-content">
                    <div id="agent-details" class="agent-grid"></div>
                </div>
            </div>

            <!-- Active Alerts -->
            <div class="dashboard-card full-width">
                <div class="card-header">
                    <h3>Active Alerts</h3>
                    <div class="card-controls">
                        <button class="btn-clear" onclick="clearResolvedAlerts()">Clear Resolved</button>
                    </div>
                </div>
                <div class="card-content">
                    <div id="alerts-list" class="alerts-container"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Real-time connection status -->
    <div id="connection-status" class="connection-status">
        <span class="status-dot"></span>
        <span class="status-text">Connecting...</span>
    </div>

    <script src="dashboard.js"></script>
</body>
</html>`;
  }

  _generateCSS() {
    return `/* Performance Dashboard Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8fafc;
    color: #334155;
    line-height: 1.6;
}

.dashboard {
    min-height: 100vh;
    padding: 20px;
}

/* Header */
.dashboard-header {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
}

.dashboard-header h1 {
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
}

.header-stats {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
}

.stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
}

.stat label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.stat span {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
}

.status-indicator {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px !important;
    font-weight: 500 !important;
    text-transform: uppercase;
}

.status-indicator.healthy {
    background: #dcfce7;
    color: #166534;
}

.status-indicator.degraded {
    background: #fef3c7;
    color: #92400e;
}

.status-indicator.unhealthy {
    background: #fee2e2;
    color: #991b1b;
}

.alert-count {
    padding: 2px 8px;
    background: #fee2e2;
    color: #991b1b;
    border-radius: 12px;
    font-size: 14px !important;
    min-width: 24px;
}

.alert-count.zero {
    background: #dcfce7;
    color: #166534;
}

/* Grid */
.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 24px;
}

.dashboard-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.dashboard-card.full-width {
    grid-column: 1 / -1;
}

.card-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
}

.card-controls {
    display: flex;
    gap: 8px;
    align-items: center;
}

.btn-refresh, .btn-clear {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-refresh:hover, .btn-clear:hover {
    background: #e2e8f0;
}

.card-content {
    padding: 24px;
}

/* Chart containers */
canvas {
    max-width: 100%;
    height: 300px !important;
}

/* Agent Details */
.agent-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

.agent-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
}

.agent-card.healthy {
    border-color: #22c55e;
    background: #f0fdf4;
}

.agent-card.degraded {
    border-color: #eab308;
    background: #fffbeb;
}

.agent-card.unhealthy {
    border-color: #ef4444;
    background: #fef2f2;
}

.agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.agent-name {
    font-weight: 600;
    color: #1e293b;
}

.agent-status {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 500;
}

.agent-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    font-size: 12px;
}

.metric {
    display: flex;
    justify-content: space-between;
}

.metric-label {
    color: #64748b;
}

.metric-value {
    font-weight: 600;
}

/* Alerts */
.alerts-container {
    max-height: 400px;
    overflow-y: auto;
}

.alert {
    padding: 12px 16px;
    border-left: 4px solid;
    margin-bottom: 8px;
    border-radius: 0 6px 6px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.alert.critical {
    background: #fef2f2;
    border-color: #ef4444;
}

.alert.warning {
    background: #fffbeb;
    border-color: #f59e0b;
}

.alert.info {
    background: #eff6ff;
    border-color: #3b82f6;
}

.alert-content {
    flex: 1;
}

.alert-type {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 4px;
}

.alert-message {
    font-size: 14px;
    color: #374151;
}

.alert-time {
    font-size: 11px;
    color: #6b7280;
    margin-top: 4px;
}

.alert-dismiss {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    color: #6b7280;
}

/* Connection Status */
.connection-status {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse 2s infinite;
}

.status-dot.connected {
    background: #22c55e;
    animation: none;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Responsive */
@media (max-width: 768px) {
    .dashboard {
        padding: 12px;
    }
    
    .dashboard-header {
        flex-direction: column;
        align-items: stretch;
        text-align: center;
    }
    
    .header-stats {
        justify-content: center;
    }
    
    .dashboard-grid {
        grid-template-columns: 1fr;
    }
    
    .agent-grid {
        grid-template-columns: 1fr;
    }
}

/* Scrollbar styling */
::-webkit-scrollbar {
    width: 6px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}`;
  }

  async _generateJavaScript() {
    return `// Performance Dashboard JavaScript

class DashboardManager {
    constructor() {
        this.charts = {};
        this.data = null;
        this.wsConnection = null;
        this.updateInterval = 5000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadInitialData();
            this.initializeCharts();
            this.updateDisplay();
            this.startRealTimeUpdates();
            
            // Set up periodic refresh
            setInterval(() => {
                if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
                    this.loadInitialData().then(() => this.updateDisplay());
                }
            }, this.updateInterval);
            
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }
    
    async loadInitialData() {
        try {
            const response = await fetch('./data.json');
            if (!response.ok) throw new Error('Failed to fetch data');
            this.data = await response.json();
        } catch (error) {
            // Fallback to mock data for demo
            this.data = this.generateMockData();
        }
    }
    
    initializeCharts() {
        const chartConfigs = {
            systemOverviewChart: {
                type: 'line',
                data: this.data.charts.systemOverview.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            },
            
            agentPerformanceChart: {
                type: 'bar',
                data: this.data.charts.agentPerformance.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Response Time (ms)'
                            }
                        }
                    }
                }
            },
            
            taskThroughputChart: {
                type: 'doughnut',
                data: this.data.charts.taskThroughput.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            },
            
            agentHealthChart: {
                type: 'radar',
                data: this.data.charts.agentHealth.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            }
        };
        
        Object.entries(chartConfigs).forEach(([id, config]) => {
            const canvas = document.getElementById(id);
            if (canvas) {
                this.charts[id] = new Chart(canvas, config);
            }
        });
    }
    
    updateDisplay() {
        if (!this.data) return;
        
        // Update header stats
        this.updateHeaderStats();
        
        // Update agent details
        this.updateAgentDetails();
        
        // Update alerts
        this.updateAlerts();
        
        // Update last update time
        document.getElementById('last-update').textContent = 
            new Date(this.data.lastUpdate).toLocaleTimeString();
    }
    
    updateHeaderStats() {
        const summary = this.data.summary;
        
        // System status
        const systemStatus = this.getSystemStatus(summary.system);
        const statusElement = document.getElementById('system-status');
        statusElement.textContent = systemStatus;
        statusElement.className = \`status-indicator \${systemStatus.toLowerCase()}\`;
        
        // Active agents
        document.getElementById('active-agents').textContent = 
            summary.agents.count || 0;
        
        // Active alerts
        const alertCount = summary.alerts.active || 0;
        const alertElement = document.getElementById('active-alerts');
        alertElement.textContent = alertCount;
        alertElement.className = \`alert-count \${alertCount === 0 ? 'zero' : ''}\`;
    }
    
    updateAgentDetails() {
        const container = document.getElementById('agent-details');
        const agentFilter = document.getElementById('agent-filter');
        
        if (!this.data.summary.agents.metrics) return;
        
        // Update filter options
        const currentValue = agentFilter.value;
        agentFilter.innerHTML = '<option value="">All Agents</option>';
        
        Object.keys(this.data.summary.agents.metrics).forEach(agentId => {
            const option = document.createElement('option');
            option.value = agentId;
            option.textContent = agentId;
            agentFilter.appendChild(option);
        });
        
        agentFilter.value = currentValue;
        
        // Generate agent cards
        const agents = Object.entries(this.data.summary.agents.metrics);
        const filteredAgents = currentValue ? 
            agents.filter(([id]) => id === currentValue) : agents;
        
        container.innerHTML = filteredAgents.map(([agentId, metrics]) => 
            this.generateAgentCard(agentId, metrics)
        ).join('');
    }
    
    generateAgentCard(agentId, metrics) {
        const healthClass = metrics.health.status;
        const statusClass = this.getAgentStatusClass(metrics.status);
        
        return \`
            <div class="agent-card \${healthClass}">
                <div class="agent-header">
                    <span class="agent-name">\${agentId}</span>
                    <span class="agent-status \${statusClass}">\${metrics.status}</span>
                </div>
                <div class="agent-metrics">
                    <div class="metric">
                        <span class="metric-label">Health Score</span>
                        <span class="metric-value">\${metrics.health.score}/100</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Tasks Completed</span>
                        <span class="metric-value">\${metrics.tasks.completed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value">\${metrics.tasks.successRate.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Response</span>
                        <span class="metric-value">\${metrics.performance.averageResponseTime.toFixed(0)}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Token Usage</span>
                        <span class="metric-value">\${this.formatNumber(metrics.performance.tokenUsage)}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value">\${metrics.errors.rate.toFixed(2)}/min</span>
                    </div>
                </div>
            </div>
        \`;
    }
    
    updateAlerts() {
        const container = document.getElementById('alerts-list');
        const alerts = this.data.alerts || [];
        
        if (alerts.length === 0) {
            container.innerHTML = '<div class="no-alerts">No active alerts</div>';
            return;
        }
        
        container.innerHTML = alerts.map(alert => \`
            <div class="alert \${alert.severity}">
                <div class="alert-content">
                    <div class="alert-type">\${alert.type}</div>
                    <div class="alert-message">\${this.formatAlertMessage(alert)}</div>
                    <div class="alert-time">\${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <button class="alert-dismiss" onclick="dismissAlert('\${alert.id}')">×</button>
            </div>
        \`).join('');
    }
    
    formatAlertMessage(alert) {
        switch (alert.type) {
            case 'system:cpu:high':
                return \`CPU usage is \${alert.data.current.toFixed(1)}% (threshold: \${alert.data.threshold}%)\`;
            case 'system:memory:high':
                return \`Memory usage is \${alert.data.current.toFixed(1)}% (threshold: \${alert.data.threshold}%)\`;
            case 'agent:response:slow':
                return \`Agent \${alert.data.agentId} response time is \${alert.data.current}ms (threshold: \${alert.data.threshold}ms)\`;
            case 'agent:errors:high':
                return \`Agent \${alert.data.agentId} has \${alert.data.errorCount} errors in the last minute\`;
            default:
                return alert.data.message || 'Alert triggered';
        }
    }
    
    getSystemStatus(systemMetrics) {
        if (!systemMetrics) return 'Unknown';
        
        const cpu = systemMetrics.system.cpu || 0;
        const memory = systemMetrics.system.memory || 0;
        
        if (cpu > 80 || memory > 85) return 'Unhealthy';
        if (cpu > 60 || memory > 70) return 'Degraded';
        return 'Healthy';
    }
    
    getAgentStatusClass(status) {
        const statusMap = {
            'healthy': 'healthy',
            'degraded': 'degraded',
            'unhealthy': 'unhealthy',
            'failing': 'unhealthy',
            'inactive': 'degraded',
            'idle': 'healthy',
            'ready': 'healthy'
        };
        
        return statusMap[status] || 'unknown';
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    startRealTimeUpdates() {
        // Try to establish WebSocket connection for real-time updates
        this.connectWebSocket();
    }
    
    connectWebSocket() {
        try {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${location.host}/ws\`;
            
            this.wsConnection = new WebSocket(wsUrl);
            
            this.wsConnection.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
            };
            
            this.wsConnection.onmessage = (event) => {
                try {
                    const update = JSON.parse(event.data);
                    this.handleRealTimeUpdate(update);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            this.wsConnection.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                this.scheduleReconnect();
            };
            
            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.log('WebSocket not available, using polling');
            this.updateConnectionStatus(false);
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connectWebSocket();
            }, delay);
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (connected) {
            dot.classList.add('connected');
            text.textContent = 'Real-time';
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Polling';
        }
    }
    
    handleRealTimeUpdate(update) {
        switch (update.type) {
            case 'metrics':
                this.data.lastUpdate = update.timestamp;
                this.updateDisplay();
                break;
            case 'alert':
                this.data.alerts.push(update.data);
                this.updateAlerts();
                break;
            case 'task':
                // Update task-related metrics
                break;
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = \`
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            color: #991b1b;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid #fecaca;
            z-index: 1000;
        \`;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    generateMockData() {
        // Generate mock data for demonstration
        return {
            lastUpdate: new Date().toISOString(),
            summary: {
                system: {
                    system: {
                        cpu: Math.random() * 60 + 20,
                        memory: Math.random() * 50 + 30
                    }
                },
                agents: {
                    count: 3,
                    metrics: {
                        'analyst-001': {
                            status: 'healthy',
                            health: { score: 95, status: 'healthy' },
                            tasks: { completed: 145, successRate: 98.5 },
                            performance: { averageResponseTime: 1250, tokenUsage: 45000 },
                            errors: { rate: 0.1 }
                        },
                        'architect-001': {
                            status: 'healthy',
                            health: { score: 87, status: 'healthy' },
                            tasks: { completed: 89, successRate: 94.2 },
                            performance: { averageResponseTime: 1800, tokenUsage: 38000 },
                            errors: { rate: 0.3 }
                        },
                        'developer-001': {
                            status: 'degraded',
                            health: { score: 72, status: 'degraded' },
                            tasks: { completed: 203, successRate: 91.8 },
                            performance: { averageResponseTime: 2400, tokenUsage: 52000 },
                            errors: { rate: 0.8 }
                        }
                    }
                },
                alerts: { active: 2 }
            },
            charts: {
                systemOverview: {
                    data: {
                        labels: Array.from({length: 20}, (_, i) => \`\${i}:00\`),
                        datasets: [
                            {
                                label: 'CPU Usage (%)',
                                data: Array.from({length: 20}, () => Math.random() * 60 + 20),
                                borderColor: '#ff6b6b',
                                backgroundColor: 'rgba(255, 107, 107, 0.1)'
                            },
                            {
                                label: 'Memory Usage (%)',
                                data: Array.from({length: 20}, () => Math.random() * 50 + 30),
                                borderColor: '#4ecdc4',
                                backgroundColor: 'rgba(78, 205, 196, 0.1)'
                            }
                        ]
                    }
                },
                agentPerformance: {
                    data: {
                        labels: ['analyst-001', 'architect-001', 'developer-001'],
                        datasets: [{
                            label: 'Avg Response Time (ms)',
                            data: [1250, 1800, 2400],
                            backgroundColor: ['#51cf66', '#51cf66', '#ffd43b']
                        }]
                    }
                },
                taskThroughput: {
                    data: {
                        labels: ['Completed', 'Failed', 'In Progress'],
                        datasets: [{
                            data: [437, 18, 5],
                            backgroundColor: ['#51cf66', '#ff6b6b', '#ffd43b']
                        }]
                    }
                },
                agentHealth: {
                    data: {
                        labels: ['analyst-001', 'architect-001', 'developer-001'],
                        datasets: [{
                            label: 'Health Score',
                            data: [95, 87, 72],
                            backgroundColor: 'rgba(78, 205, 196, 0.2)',
                            borderColor: '#4ecdc4',
                            pointBackgroundColor: '#4ecdc4'
                        }]
                    }
                }
            },
            alerts: [
                {
                    id: 'alert-1',
                    type: 'agent:response:slow',
                    severity: 'warning',
                    data: { agentId: 'developer-001', current: 2400, threshold: 2000 },
                    timestamp: Date.now() - 300000
                },
                {
                    id: 'alert-2',
                    type: 'system:cpu:high',
                    severity: 'warning',
                    data: { current: 75.2, threshold: 70 },
                    timestamp: Date.now() - 600000
                }
            ]
        };
    }
}

// Global functions
function refreshChart(chartId) {
    if (window.dashboard && window.dashboard.charts[chartId + 'Chart']) {
        window.dashboard.loadInitialData().then(() => {
            window.dashboard.charts[chartId + 'Chart'].update();
            window.dashboard.updateDisplay();
        });
    }
}

function filterAgents() {
    if (window.dashboard) {
        window.dashboard.updateAgentDetails();
    }
}

function dismissAlert(alertId) {
    if (window.dashboard && window.dashboard.data) {
        window.dashboard.data.alerts = window.dashboard.data.alerts.filter(
            alert => alert.id !== alertId
        );
        window.dashboard.updateAlerts();
    }
}

function clearResolvedAlerts() {
    if (window.dashboard && window.dashboard.data) {
        window.dashboard.data.alerts = [];
        window.dashboard.updateAlerts();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});`;
  }

  async _updateDashboardData() {
    const oldData = this.dashboardData;
    
    try {
      this.dashboardData = {
        lastUpdate: new Date().toISOString(),
        summary: this.monitor.getPerformanceSummary(),
        charts: await this._generateChartData(),
        alerts: Array.from(this.monitor.activeAlerts.values())
      };
      
      // Broadcast update to connected clients
      if (this.options.enableRealTime) {
        this._broadcastUpdate('dashboard', {
          type: 'full_update',
          data: this.dashboardData,
          timestamp: this.dashboardData.lastUpdate
        });
      }
      
    } catch (error) {
      console.error('Failed to update dashboard data:', error);
      this.dashboardData = oldData; // Revert to previous data
    }
  }

  _broadcastUpdate(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast to all connected clients
    for (const client of this.clients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        } else {
          this.clients.delete(client);
        }
      } catch (error) {
        this.clients.delete(client);
      }
    }
  }

  addClient(websocket) {
    this.clients.add(websocket);
    
    // Send current data to new client
    websocket.send(JSON.stringify({
      type: 'initial',
      data: this.dashboardData,
      timestamp: new Date().toISOString()
    }));
  }

  removeClient(websocket) {
    this.clients.delete(websocket);
  }
}