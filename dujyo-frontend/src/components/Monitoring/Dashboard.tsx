//! Custom Monitoring Dashboard for Dujyo
//! 
//! This component provides comprehensive monitoring without paid tools:
//! - Real-time metrics (TPS, users, errors)
//! - Charts with Chart.js (free)
//! - Email alerts (using free SMTP service)
//! - Centralized logs
//! - Health checks every minute

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Database,
  Server,
  Globe,
  Zap,
  BarChart3,
  RefreshCw,
  Settings,
  Download,
  Mail,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';

// Chart.js imports (free)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ===========================================
// TYPES & INTERFACES
// ===========================================

interface SystemMetrics {
  timestamp: number;
  tps: number;
  activeUsers: number;
  errorRate: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  blockchainHeight: number;
  pendingTransactions: number;
  cacheHitRate: number;
  databaseConnections: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  responseTime: number;
  lastCheck: number;
  uptime: number;
  details: Record<string, any>;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

// ===========================================
// MONITORING DASHBOARD COMPONENT
// ===========================================

const MonitoringDashboard: React.FC = () => {
  // State management
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [showSettings, setShowSettings] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState({
    errorRate: 5,
    responseTime: 1000,
    memoryUsage: 80,
    cpuUsage: 80,
  });

  // ===========================================
  // DATA FETCHING
  // ===========================================

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => {
          const newMetrics = [...prev, data];
          // Keep only last 100 data points
          return newMetrics.slice(-100);
        });
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }, []);

  const fetchHealthChecks = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/health');
      if (response.ok) {
        const data = await response.json();
        setHealthChecks(data);
      }
    } catch (error) {
      console.error('Failed to fetch health checks:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/monitoring/logs?limit=50&level=error,warn`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchAlerts(),
      fetchHealthChecks(),
      fetchLogs(),
    ]);
    setIsLoading(false);
  }, [fetchMetrics, fetchAlerts, fetchHealthChecks, fetchLogs]);

  // ===========================================
  // EFFECTS
  // ===========================================

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAllData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchAllData]);

  // ===========================================
  // CHART DATA PREPARATION
  // ===========================================

  const getChartData = () => {
    const timeLabels = metrics.map(m => new Date(m.timestamp).toLocaleTimeString());
    const tpsData = metrics.map(m => m.tps);
    const usersData = metrics.map(m => m.activeUsers);
    const errorRateData = metrics.map(m => m.errorRate);
    const responseTimeData = metrics.map(m => m.responseTime);

    return {
      tps: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Transactions Per Second',
            data: tpsData,
            borderColor: 'rgb(0, 255, 136)',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            tension: 0.4,
          },
        ],
      },
      users: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Active Users',
            data: usersData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
          },
        ],
      },
      errors: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Error Rate (%)',
            data: errorRateData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
          },
        ],
      },
      responseTime: {
        labels: timeLabels,
        datasets: [
          {
            label: 'Response Time (ms)',
            data: responseTimeData,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
          },
        ],
      },
    };
  };

  const getSystemHealthData = () => {
    const healthy = healthChecks.filter(h => h.status === 'healthy').length;
    const warning = healthChecks.filter(h => h.status === 'warning').length;
    const critical = healthChecks.filter(h => h.status === 'critical').length;

    return {
      labels: ['Healthy', 'Warning', 'Critical'],
      datasets: [
        {
          data: [healthy, warning, critical],
          backgroundColor: [
            'rgb(34, 197, 94)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 0,
        },
      ],
    };
  };

  // ===========================================
  // ALERT HANDLING
  // ===========================================

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/monitoring/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // ===========================================
  // EXPORT FUNCTIONS
  // ===========================================

  const exportMetrics = () => {
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dujyo-metrics-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dujyo-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ===========================================
  // RENDER HELPERS
  // ===========================================

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Bell className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // ===========================================
  // CHART OPTIONS
  // ===========================================

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  // ===========================================
  // RENDER
  // ===========================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
          <p className="text-gray-400">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  const chartData = getChartData();
  const systemHealthData = getSystemHealthData();
  const currentMetrics = metrics[metrics.length - 1];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-500">Dujyo Monitoring</h1>
          <p className="text-gray-400">Real-time system monitoring and analytics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              autoRefresh ? 'bg-green-600' : 'bg-gray-700'
            }`}
          >
            {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Auto Refresh</span>
          </button>
          
          <button
            onClick={fetchAllData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-6 bg-gray-800 rounded-lg"
          >
            <h3 className="text-xl font-semibold mb-4">Monitoring Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Refresh Interval</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full p-2 bg-gray-700 rounded-lg"
                >
                  <option value={10000}>10 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Time Range</label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                  className="w-full p-2 bg-gray-700 rounded-lg"
                >
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailAlerts"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="emailAlerts">Email Alerts</label>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={exportMetrics}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Metrics</span>
                </button>
                <button
                  onClick={exportLogs}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Logs</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Transactions/sec</p>
              <p className="text-2xl font-bold text-green-500">
                {currentMetrics?.tps.toFixed(2) || '0.00'}
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-blue-500">
                {currentMetrics?.activeUsers || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Error Rate</p>
              <p className="text-2xl font-bold text-red-500">
                {currentMetrics?.errorRate.toFixed(2) || '0.00'}%
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Response Time</p>
              <p className="text-2xl font-bold text-yellow-500">
                {currentMetrics?.responseTime.toFixed(0) || '0'}ms
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* TPS Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Transactions Per Second</h3>
          <div className="h-64">
            <Line data={chartData.tps} options={chartOptions} />
          </div>
        </motion.div>

        {/* Active Users Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Active Users</h3>
          <div className="h-64">
            <Line data={chartData.users} options={chartOptions} />
          </div>
        </motion.div>

        {/* Error Rate Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Error Rate</h3>
          <div className="h-64">
            <Line data={chartData.errors} options={chartOptions} />
          </div>
        </motion.div>

        {/* System Health Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">System Health</h3>
          <div className="h-64">
            <Doughnut data={systemHealthData} options={doughnutOptions} />
          </div>
        </motion.div>
      </div>

      {/* Alerts and Health Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.type === 'error' ? 'border-red-500 bg-red-900/20' :
                  alert.type === 'warning' ? 'border-yellow-500 bg-yellow-900/20' :
                  alert.type === 'info' ? 'border-blue-500 bg-blue-900/20' :
                  'border-green-500 bg-green-900/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-gray-400">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs px-2 py-1 bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Ack
                      </button>
                    )}
                    {!alert.resolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="text-xs px-2 py-1 bg-green-600 rounded hover:bg-green-700"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Health Checks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800 p-6 rounded-lg"
        >
          <h3 className="text-lg font-semibold mb-4">Service Health</h3>
          <div className="space-y-3">
            {healthChecks.map((health) => (
              <div
                key={health.service}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {getStatusIcon(health.status)}
                  <div>
                    <p className="font-medium">{health.service}</p>
                    <p className="text-sm text-gray-400">
                      {health.responseTime}ms • {Math.floor(health.uptime / 3600)}h uptime
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    health.status === 'healthy' ? 'text-green-500' :
                    health.status === 'warning' ? 'text-yellow-500' :
                    health.status === 'critical' ? 'text-red-500' :
                    'text-gray-500'
                  }`}>
                    {health.status.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-800 p-6 rounded-lg"
      >
        <h3 className="text-lg font-semibold mb-4">Recent Logs</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.slice(0, 10).map((log) => (
            <div
              key={log.id}
              className={`p-3 rounded-lg ${
                log.level === 'error' ? 'bg-red-900/20 border-l-4 border-red-500' :
                log.level === 'warn' ? 'bg-yellow-900/20 border-l-4 border-yellow-500' :
                log.level === 'info' ? 'bg-blue-900/20 border-l-4 border-blue-500' :
                'bg-gray-700 border-l-4 border-gray-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{log.service}</p>
                  <p className="text-sm text-gray-400">{log.message}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                  <p className={`text-xs font-medium ${
                    log.level === 'error' ? 'text-red-500' :
                    log.level === 'warn' ? 'text-yellow-500' :
                    log.level === 'info' ? 'text-blue-500' :
                    'text-gray-500'
                  }`}>
                    {log.level.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MonitoringDashboard;
