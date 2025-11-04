'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from '@/components/charts/LazyRecharts';
import { Cell } from 'recharts'
import { colorForIndex, chartStyles, gradientIdFor } from '@/components/charts/chartTheme'
import {
  Activity,
  Users,
  Calendar,
  DollarSign,
  Bed,
  TrendingUp,
  Download,
  RefreshCw,
  Filter,
  BarChart3,
  PieChartIcon,
  LineChartIcon,
  AreaChartIcon,
  Settings,
  Maximize2,
  X,
} from 'lucide-react';

interface AnalyticsData {
  patientData: any[];
  appointmentData: any[];
  revenueData: any[];
  bedOccupancyData: any[];
  staffData: any[];
  departmentData: any[];
  hospitalizationReasons: any[];
  kpiMetrics: {
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    bedOccupancy: number;
    staffUtilization?: number;
    patientSatisfaction?: number;
  };
}

// Dark dashboard uses accessible dark palette
const MODE: 'dark' | 'light' = 'dark'

export default function AnalyticsPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [chartTypes, setChartTypes] = useState({
    patients: 'line',
    appointments: 'bar',
    revenue: 'area',
    bedOccupancy: 'line',
    staff: 'bar',
    departments: 'pie',
    hospitalizationReasons: 'bar',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60000); // 60 seconds
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchAnalytics();
    }
  }, [token, dateRange]);

  useEffect(() => {
    if (autoRefresh && token) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, token, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        hospitalId: user?.hospital_id,
      };
      // Fetch all analytics data in parallel (no mock fallbacks)
      const [patientsRes, appointmentsRes, revenueRes, bedOccRes, staffRes, departmentsRes] = await Promise.allSettled([
        apiClient.getPatientAnalytics(token!, params),
        apiClient.getAppointmentAnalytics(token!, params),
        apiClient.getRevenueAnalytics(token!, params),
        apiClient.getBedOccupancyAnalytics(token!, params),
        apiClient.getStaffAnalytics(token!, params),
        apiClient.getDepartmentAnalytics(token!, params),
      ]);

      const safe = <T,>(res: PromiseSettledResult<T>, extractor?: (v: any) => any, fallback: any = []) =>
        res.status === 'fulfilled' ? (extractor ? extractor(res.value as any) : (res.value as any)) : fallback;

      const patients = safe(patientsRes, (v) => v);
      const appointments = safe(appointmentsRes, (v) => v);
      const revenue = safe(revenueRes, (v) => v);
      const bedOccupancy = safe(bedOccRes, (v) => v);
      const staff = safe(staffRes, (v) => v);
      const departments = safe(departmentsRes, (v) => v);

      const patientData = patients?.data ?? patients ?? [];
      const appointmentData = appointments?.data ?? appointments ?? [];
      const revenueData = revenue?.data ?? revenue ?? [];
      const bedOccupancyData = bedOccupancy?.data ?? bedOccupancy ?? [];
      const staffData = staff?.data ?? staff ?? [];
      const departmentData = departments?.data ?? departments ?? [];

      setAnalyticsData({
        patientData,
        appointmentData,
        revenueData,
        bedOccupancyData,
        staffData,
        departmentData,
        hospitalizationReasons: [],
        kpiMetrics: {
          totalPatients: patients?.total ?? 0,
          totalAppointments: appointments?.total ?? 0,
          totalRevenue: revenue?.total ?? 0,
          bedOccupancy: bedOccupancy?.occupancy ?? 0,
          staffUtilization: staff?.utilization ?? undefined,
          patientSatisfaction: undefined,
        },
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to load analytics data. Please try again.');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAnalysis = async () => {
    if (!analyticsData || !token) return;
    
    try {
      setLoadingAI(true);
      
      // Use quick AI analysis endpoint
      const analysis = await apiClient.getQuickAIAnalysis(token);
      setAiAnalysis(analysis);
      
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAiError('AI analysis service is currently unavailable.');
      setAiAnalysis(null);
    } finally {
      setLoadingAI(false);
    }
  };

  // Auto-fetch AI analysis when hospitalization data changes
  useEffect(() => {
    if (analyticsData?.hospitalizationReasons && !aiAnalysis) {
      fetchAIAnalysis();
    }
  }, [analyticsData?.hospitalizationReasons]);

  

  const exportData = async (format: 'csv' | 'pdf' | 'json') => {
    if (!analyticsData) return;

    switch (format) {
      case 'json':
        const jsonData = JSON.stringify(analyticsData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: 'application/json' });
        downloadFile(jsonBlob, `analytics-${Date.now()}.json`);
        break;

      case 'csv':
        let csv = 'Date,Metric,Value\n';
        analyticsData.patientData.forEach((d: any) => {
          csv += `${d.date},Admissions,${d.admissions}\n`;
          csv += `${d.date},Discharges,${d.discharges}\n`;
          csv += `${d.date},Visits,${d.visits}\n`;
        });
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        downloadFile(csvBlob, `analytics-${Date.now()}.csv`);
        break;

      case 'pdf':
        try {
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Hospital Analytics Report', 14, 20);
          doc.setFontSize(10);
          doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
          doc.text(`Range: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 34);
          doc.text('Summary:', 14, 44);
          const metrics = analyticsData.kpiMetrics || {};
          doc.text(`- Patients: ${metrics.totalPatients ?? '-'}`, 20, 52);
          doc.text(`- Appointments: ${metrics.totalAppointments ?? '-'}`, 20, 58);
          doc.text(`- Revenue: ${metrics.totalRevenue ?? '-'}`, 20, 64);
          doc.save(`analytics-${Date.now()}.pdf`);
        } catch (e) {
          console.error(e);
        }
        break;
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderChart = (type: string, data: any[], chartType: string, title: string, dataKeys: any) => {
    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const chartContent = () => {
      switch (chartType) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey="date" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartStyles[MODE].tooltipBg,
                  border: `1px solid ${chartStyles[MODE].tooltipBorder}`,
                  borderRadius: '8px',
                  color: chartStyles[MODE].tooltipText,
                }}
              />
              <Legend wrapperStyle={{ color: chartStyles[MODE].legend }} />
              {dataKeys.map((key: any, idx: number) => {
                const c = colorForIndex(idx, MODE)
                return (
                  <Line
                    key={key.dataKey}
                    type="monotone"
                    dataKey={key.dataKey}
                    stroke={c}
                    strokeWidth={2}
                    dot={{ fill: c, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )
              })}
            </LineChart>
          );

        case 'bar':
          return (
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey={dataKeys[0]?.xKey || 'date'} stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartStyles[MODE].tooltipBg,
                  border: `1px solid ${chartStyles[MODE].tooltipBorder}`,
                  borderRadius: '8px',
                  color: chartStyles[MODE].tooltipText,
                }}
              />
              <Legend wrapperStyle={{ color: chartStyles[MODE].legend }} />
              {dataKeys.map((key: any, idx: number) => (
                <Bar
                  key={key.dataKey}
                  dataKey={key.dataKey}
                  fill={colorForIndex(idx, MODE)}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          );

        case 'area':
          return (
            <AreaChart {...commonProps}>
              <defs>
                {dataKeys.map((key: any, idx: number) => {
                  const c = colorForIndex(idx, MODE)
                  const gid = gradientIdFor(key.dataKey)
                  return (
                    <linearGradient key={key.dataKey} id={gid} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={c} stopOpacity={0.1} />
                    </linearGradient>
                  )
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyles[MODE].grid} opacity={0.4} />
              <XAxis dataKey="date" stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <YAxis stroke={chartStyles[MODE].axis} tick={{ fill: chartStyles[MODE].axisTick }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartStyles[MODE].tooltipBg,
                  border: `1px solid ${chartStyles[MODE].tooltipBorder}`,
                  borderRadius: '8px',
                  color: chartStyles[MODE].tooltipText,
                }}
              />
              <Legend wrapperStyle={{ color: chartStyles[MODE].legend }} />
              {dataKeys.map((key: any, idx: number) => {
                const c = colorForIndex(idx, MODE)
                const gid = `url(#${gradientIdFor(key.dataKey)})`
                return (
                  <Area
                    key={key.dataKey}
                    type="monotone"
                    dataKey={key.dataKey}
                    stroke={c}
                    strokeWidth={2}
                    fill={gid}
                  />
                )
              })}
            </AreaChart>
          );

        case 'pie':
          return (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colorForIndex(index, MODE)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: chartStyles[MODE].tooltipBg,
                  border: `1px solid ${chartStyles[MODE].tooltipBorder}`,
                  borderRadius: '8px',
                  color: chartStyles[MODE].tooltipText,
                }}
              />
            </PieChart>
          );

        default:
          return null;
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={chartType}
              onChange={(e) => setChartTypes({ ...chartTypes, [type]: e.target.value })}
              className="bg-gray-800/50 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="line">Line</option>
              <option value="bar">Bar</option>
              <option value="area">Area</option>
              {type === 'departments' && <option value="pie">Pie</option>}
            </select>
            <button
              onClick={() => setExpandedChart(expandedChart === type ? null : type)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {expandedChart === type ? (
                <X className="w-4 h-4 text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={expandedChart === type ? 500 : 300}>
          {chartContent() || <div></div>}
        </ResponsiveContainer>
      </motion.div>
    );
  };

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAnalytics} className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-lg text-sm hover:bg-red-500/30">Retry</button>
          </div>
        )}
        {aiError && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-xl">
            {aiError}
          </div>
        )}
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <BarChart3 className="w-10 h-10 text-blue-400" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400">
              Comprehensive insights and data visualization for {user?.hospital_id ? 'your hospital' : 'all facilities'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${
                autoRefresh
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  : 'bg-gray-800/50 text-gray-400 border border-white/10 hover:bg-gray-700/50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-500/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative">
              <select
                onChange={(e) => exportData(e.target.value as any)}
                className="px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg font-medium hover:bg-purple-500/30 transition-all duration-300 appearance-none cursor-pointer"
              >
                <option value="">Export Data</option>
                <option value="json">Export JSON</option>
                <option value="csv">Export CSV</option>
                <option value="pdf">Export PDF</option>
              </select>
              <Download className="w-4 h-4 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-blue-400" />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="bg-gray-800/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="bg-gray-800/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-gray-800/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Metrics</option>
              <option value="patients">Patients</option>
              <option value="appointments">Appointments</option>
              <option value="revenue">Revenue</option>
              <option value="beds">Bed Occupancy</option>
              <option value="staff">Staff</option>
              <option value="departments">Departments</option>
            </select>

            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-gray-800/50 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={30000}>Refresh every 30s</option>
                <option value={60000}>Refresh every 1m</option>
                <option value={300000}>Refresh every 5m</option>
                <option value={600000}>Refresh every 10m</option>
              </select>
            )}
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {analyticsData && [
            { icon: Users, label: 'Total Patients', value: analyticsData.kpiMetrics.totalPatients?.toLocaleString?.() ?? 'N/A', color: 'blue' },
            { icon: Calendar, label: 'Appointments', value: analyticsData.kpiMetrics.totalAppointments?.toLocaleString?.() ?? 'N/A', color: 'green' },
            { icon: DollarSign, label: 'Revenue', value: analyticsData.kpiMetrics.totalRevenue ? `$${(analyticsData.kpiMetrics.totalRevenue / 1000).toFixed(0)}K` : 'N/A', color: 'amber' },
            { icon: Bed, label: 'Bed Occupancy', value: typeof analyticsData.kpiMetrics.bedOccupancy === 'number' ? `${analyticsData.kpiMetrics.bedOccupancy}%` : 'N/A', color: 'purple' },
            { icon: Activity, label: 'Staff Utilization', value: typeof analyticsData.kpiMetrics.staffUtilization === 'number' ? `${analyticsData.kpiMetrics.staffUtilization}%` : 'N/A', color: 'pink' },
            { icon: TrendingUp, label: 'Patient Satisfaction', value: typeof analyticsData.kpiMetrics.patientSatisfaction === 'number' ? `${analyticsData.kpiMetrics.patientSatisfaction}%` : 'N/A', color: 'cyan' },
          ].map((kpi, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className={`w-8 h-8 text-${kpi.color}-400`} />
                <TrendingUp className={`w-5 h-5 text-${kpi.color}-400`} />
              </div>
              <p className="text-gray-400 text-sm mb-2">{kpi.label}</p>
              <p className="text-3xl font-bold text-white">{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* AI Alerts Section - Gemini 2.5 Flash Powered */}
        {aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br ${
              aiAnalysis.alert_level === 'CRITICAL' ? 'from-red-900/30 via-orange-900/30 to-red-900/30 border-red-500/50' :
              aiAnalysis.alert_level === 'HIGH' ? 'from-orange-900/30 via-yellow-900/30 to-orange-900/30 border-orange-500/50' :
              'from-blue-900/30 via-purple-900/30 to-blue-900/30 border-blue-500/50'
            } backdrop-blur-xl border-2 rounded-2xl p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${
                  aiAnalysis.alert_level === 'CRITICAL' ? 'from-red-500 to-red-600' :
                  aiAnalysis.alert_level === 'HIGH' ? 'from-orange-500 to-orange-600' :
                  'from-blue-500 to-blue-600'
                } rounded-xl flex items-center justify-center shadow-glow animate-pulse`}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    🤖 AI Insights - Gemini 2.5 Flash
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      aiAnalysis.alert_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                      aiAnalysis.alert_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                      aiAnalysis.alert_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                      'bg-green-500/20 text-green-400 border border-green-500/50'
                    }`}>
                      {aiAnalysis.alert_level}
                    </span>
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Intelligent analysis of hospitalization trends • Pandemic detection • Outbreak alerts
                  </p>
                </div>
              </div>
              <button
                onClick={fetchAIAnalysis}
                disabled={loadingAI}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-500/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingAI ? 'animate-spin' : ''}`} />
                Refresh AI
              </button>
            </div>

            {/* AI Summary & Risk */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="col-span-2 bg-gray-900/50 rounded-xl p-5 border border-white/10">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  AI Summary
                </h4>
                <p className="text-gray-300 leading-relaxed">{aiAnalysis.summary}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <span>Model: {aiAnalysis.ai_model}</span>
                  <span>•</span>
                  <span>Confidence: {aiAnalysis.confidence_score.toFixed(0)}%</span>
                  <span>•</span>
                  <span>Generated: {new Date(aiAnalysis.generated_at).toLocaleTimeString()}</span>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-xl p-5 border border-white/10">
                <h4 className="text-white font-semibold mb-3">Pandemic Risk</h4>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${
                    aiAnalysis.pandemic_risk > 70 ? 'text-red-400' :
                    aiAnalysis.pandemic_risk > 40 ? 'text-orange-400' :
                    'text-green-400'
                  }`}>
                    {aiAnalysis.pandemic_risk}%
                  </span>
                  {aiAnalysis.outbreak_detected && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-bold animate-pulse">
                      OUTBREAK
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      aiAnalysis.pandemic_risk > 70 ? 'bg-red-500' :
                      aiAnalysis.pandemic_risk > 40 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${aiAnalysis.pandemic_risk}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Critical Findings */}
            {aiAnalysis.critical_findings && aiAnalysis.critical_findings.length > 0 && (
              <div className="bg-gray-900/50 rounded-xl p-5 border border-white/10 mb-6">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Critical Findings
                </h4>
                <ul className="space-y-2">
                  {aiAnalysis.critical_findings.map((finding: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-300">
                      <span className="text-orange-400 mt-1">•</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Alerts */}
            {aiAnalysis.alerts && aiAnalysis.alerts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {aiAnalysis.alerts.map((alert: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-xl border-2 ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' :
                      alert.severity === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50' :
                      'bg-yellow-500/10 border-yellow-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-white font-bold flex items-center gap-2">
                        {alert.type === 'PANDEMIC_RISK' && '🦠'}
                        {alert.type === 'SUDDEN_SPIKE' && '📈'}
                        {alert.type === 'OUTBREAK' && '⚠️'}
                        {alert.type === 'RESOURCE_STRAIN' && '🏥'}
                        {alert.reason}
                      </h5>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{alert.description}</p>
                    <p className="text-gray-400 text-xs mb-3"><strong>Evidence:</strong> {alert.evidence}</p>
                    <div className="bg-gray-900/50 rounded-lg p-3 border-l-4 border-blue-500">
                      <p className="text-sm text-blue-300"><strong>Action Required:</strong></p>
                      <p className="text-sm text-gray-300 mt-1">{alert.action_required}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {aiAnalysis.recommendations.immediate_actions.length > 0 && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                  <h5 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Immediate Actions
                  </h5>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.immediate_actions.map((action: string, idx: number) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.recommendations.govt_coordination.length > 0 && (
                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                  <h5 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Govt Coordination
                  </h5>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.govt_coordination.map((action: string, idx: number) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.recommendations.preventive_measures.length > 0 && (
                <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                  <h5 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Prevention
                  </h5>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.preventive_measures.map((action: string, idx: number) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-yellow-400 mt-0.5">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.recommendations.resource_allocation.length > 0 && (
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
                  <h5 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Resources
                  </h5>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.resource_allocation.map((action: string, idx: number) => (
                      <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Trend Forecast */}
            <div className="bg-gray-900/50 rounded-xl p-5 border border-white/10">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                AI Trend Forecast
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Next 7 Days</p>
                  <p className="text-white">{aiAnalysis.trend_forecast.next_7_days}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Next 14 Days</p>
                  <p className="text-white">{aiAnalysis.trend_forecast.next_14_days}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">Risk Trajectory</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                    aiAnalysis.trend_forecast.risk_trajectory === 'INCREASING' ? 'bg-red-500/20 text-red-400' :
                    aiAnalysis.trend_forecast.risk_trajectory === 'DECREASING' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {aiAnalysis.trend_forecast.risk_trajectory}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts Grid */}
        {analyticsData && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {(selectedMetric === 'all' || selectedMetric === 'patients') &&
              renderChart('patients', analyticsData.patientData, chartTypes.patients, 'Patient Analytics', [
                { dataKey: 'admissions' },
                { dataKey: 'discharges' },
                { dataKey: 'visits' },
              ])}

            {(selectedMetric === 'all' || selectedMetric === 'appointments') &&
              renderChart('appointments', analyticsData.appointmentData, chartTypes.appointments, 'Appointment Analytics', [
                { dataKey: 'scheduled' },
                { dataKey: 'completed' },
                { dataKey: 'cancelled' },
                { dataKey: 'noShow' },
              ])}

            {(selectedMetric === 'all' || selectedMetric === 'revenue') &&
              renderChart('revenue', analyticsData.revenueData, chartTypes.revenue, 'Revenue Analytics', [
                { dataKey: 'revenue' },
                { dataKey: 'expenses' },
                { dataKey: 'profit' },
              ])}

            {(selectedMetric === 'all' || selectedMetric === 'beds') &&
              renderChart('bedOccupancy', analyticsData.bedOccupancyData, chartTypes.bedOccupancy, 'Bed Occupancy Analytics', [
                { dataKey: 'occupied' },
                { dataKey: 'available' },
                { dataKey: 'maintenance' },
              ])}

            {(selectedMetric === 'all' || selectedMetric === 'staff') &&
              renderChart('staff', analyticsData.staffData, chartTypes.staff, 'Staff Analytics', [
                { dataKey: 'count', xKey: 'role' },
                { dataKey: 'active', xKey: 'role' },
              ])}

            {(selectedMetric === 'all' || selectedMetric === 'departments') &&
              renderChart('departments', analyticsData.departmentData, chartTypes.departments, 'Department Analytics', [
                { dataKey: 'value' },
              ])}
          </div>
        )}

        {/* Public Health Alert Section - Hospitalization Reasons */}
        {analyticsData && analyticsData.hospitalizationReasons && analyticsData.hospitalizationReasons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-900/20 via-red-900/20 to-orange-900/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-glow">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    Public Health Alert: Hospitalization Reasons
                  </h3>
                  <p className="text-sm text-gray-400">Critical data for local government health monitoring</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const alertData = {
                    timestamp: new Date().toISOString(),
                    period: `${dateRange.startDate} to ${dateRange.endDate}`,
                    hospital: user?.hospital_id || 'All Hospitals',
                    topReasons: analyticsData.hospitalizationReasons.slice(0, 5),
                    criticalAlerts: analyticsData.hospitalizationReasons.filter((r: any) => r.severity === 'critical' || parseFloat(r.trend) > 15),
                  };
                  const blob = new Blob([JSON.stringify(alertData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `public-health-alert-${Date.now()}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg font-medium hover:bg-orange-500/30 transition-all duration-300 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generate Alert Report
              </button>
            </div>

            {/* Hospitalization Reasons Chart */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-gray-900/50 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                  Hospitalization Volume by Reason
                </h4>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.hospitalizationReasons} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis 
                      dataKey="reason" 
                      stroke="#9CA3AF" 
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        borderRadius: '8px',
                        color: '#F9FAFB',
                      }}
                      formatter={((value: any, name: any, props: any) => {
                        const { severity, trend } = props.payload;
                        return [
                          <div key="tooltip" className="space-y-1">
                            <div>Count: <strong>{value}</strong></div>
                            <div>Severity: <span className={`font-bold ${severity === 'critical' ? 'text-red-400' : severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>{severity?.toUpperCase()}</span></div>
                            <div>Trend: <span className={parseFloat(trend) > 0 ? 'text-red-400' : 'text-green-400'}>{trend}</span></div>
                          </div>
                        ];
                      }) as any}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {analyticsData.hospitalizationReasons.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.severity === 'critical' ? '#EF4444' :
                            entry.severity === 'high' ? '#F97316' :
                            entry.severity === 'medium' ? '#F59E0B' :
                            '#10B981'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Critical Alerts Table */}
              <div className="bg-gray-900/50 rounded-xl p-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Critical Health Alerts (Trending ↑)
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {analyticsData.hospitalizationReasons
                    .filter((r: any) => r.severity === 'critical' || parseFloat(r.trend) > 10)
                    .map((reason: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          reason.severity === 'critical'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-orange-500/10 border-orange-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${
                              reason.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                            }`}></span>
                            <h5 className="text-white font-semibold text-sm">{reason.reason}</h5>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            reason.severity === 'critical'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {reason.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs">Cases</p>
                            <p className="text-white font-bold">{reason.count}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs">Trend</p>
                            <p className={`font-bold ${parseFloat(reason.trend) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {reason.trend}
                            </p>
                          </div>
                        </div>
                        {parseFloat(reason.trend) > 15 && (
                          <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-400 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Rapid increase detected - Local govt alert recommended</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-1">Total Cases</p>
                <p className="text-2xl font-bold text-white">
                  {analyticsData.hospitalizationReasons.reduce((sum: number, r: any) => sum + r.count, 0)}
                </p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
                <p className="text-gray-400 text-sm mb-1">Critical Severity</p>
                <p className="text-2xl font-bold text-red-400">
                  {analyticsData.hospitalizationReasons.filter((r: any) => r.severity === 'critical').length} reasons
                </p>
              </div>
              <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30">
                <p className="text-gray-400 text-sm mb-1">Trending Up (&gt;10%)</p>
                <p className="text-2xl font-bold text-orange-400">
                  {analyticsData.hospitalizationReasons.filter((r: any) => parseFloat(r.trend) > 10).length} reasons
                </p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                <p className="text-gray-400 text-sm mb-1">Most Common</p>
                <p className="text-sm font-bold text-green-400">
                  {analyticsData.hospitalizationReasons[0]?.reason}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
