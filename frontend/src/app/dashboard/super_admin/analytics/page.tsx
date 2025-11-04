'use client';



import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import dynamic from 'next/dynamic'
const SuperAdminCharts = dynamic(() => import('@/components/admin/SuperAdminCharts'), { ssr: false })
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
  Building2,
  MapPin,
  Globe,
  Maximize2,
  X,
} from 'lucide-react';
import { NoAnalyticsDataEmptyState } from '@/components/ui/EmptyState'

// Default palette (used only as fallback)
const DEFAULT_COLORS = [
  '#1E40AF', // blue-900
  '#047857', // emerald-700
  '#B45309', // amber-700
  '#DC2626', // red-600
  '#6D28D9', // purple-700
  '#BE185D', // fuchsia-700
  '#0891B2', // cyan-600
  '#EA580C', // orange-500
]

const BASE_COLOR_MAP: Record<string, string> = {
  purple: '#7C3AED', // purple-600 - better contrast on light
  blue: '#2563EB',   // blue-600
  green: '#059669',  // emerald-600
  cyan: '#0891B2',   // cyan-600
  amber: '#D97706',  // amber-600
  pink: '#DB2777',   // pink-600
  orange: '#EA580C', // orange-600
  emerald: '#059669', // emerald-600
}

export default function SuperAdminAnalyticsPage() {
  const { token, user } = useAuth();
  const [isDark, setIsDark] = useState<boolean>(true)
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedHospital, setSelectedHospital] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [chartTypes, setChartTypes] = useState<any>({
    patients: 'line',
    appointments: 'bar',
    revenue: 'area',
    hospitals: 'bar',
    regions: 'pie',
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // detect color scheme to pick appropriate color contrasts for charts and UI
  useEffect(() => {
    const detect = () => {
      try {
        // Tailwind typically toggles `dark` class on <html> for dark mode; fallback to matchMedia
        const isDocDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(Boolean(isDocDark || prefersDark))
      } catch (e) {
        setIsDark(true)
      }
    }
    detect()
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', () => detect())
    }
  }, [])

  useEffect(() => {
    if (token) {
      fetchAnalytics();
      fetchRegionsAndHospitals();
    }
  }, [token, dateRange, selectedRegion, selectedHospital]);

  useEffect(() => {
    if (autoRefresh && token) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, token, dateRange]);

  const fetchRegionsAndHospitals = async () => {
    try {
      const [regionsData, hospitalsData] = await Promise.all([
        apiClient.getRegions(token!).catch(() => []),
        apiClient.getHospitals(token!).catch(() => []),
      ]);
      setRegions(regionsData || []);
      setHospitals(hospitalsData || []);
    } catch (error) {
      console.error('Error fetching regions/hospitals:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedRegion !== 'all' && { regionId: selectedRegion }),
        ...(selectedHospital !== 'all' && { hospitalId: selectedHospital }),
      };
      // Fetch analytics series and global metrics in parallel without mock fallbacks
      const [patientsRes, appointmentsRes, revenueRes, bedOccRes, staffRes, departmentsRes, globalMetrics] = await Promise.allSettled([
        apiClient.getPatientAnalytics(token!, params),
        apiClient.getAppointmentAnalytics(token!, params),
        apiClient.getRevenueAnalytics(token!, params),
        apiClient.getBedOccupancyAnalytics(token!, params),
        apiClient.getStaffAnalytics(token!, params),
        apiClient.getDepartmentAnalytics(token!, params),
        apiClient.getGlobalMetrics(token!),
      ]);

      const safe = <T,>(res: PromiseSettledResult<T>, extractor?: (v: any) => any, fallback: any = []) =>
        res.status === 'fulfilled' ? (extractor ? extractor(res.value as any) : (res.value as any)) : fallback;

      const patientData = safe(patientsRes, (v) => v?.data ?? v, []);
      const appointmentData = safe(appointmentsRes, (v) => v?.data ?? v, []);
      const revenueData = safe(revenueRes, (v) => v?.data ?? v, []);
      const bedOccupancyData = safe(bedOccRes, (v) => v?.data ?? v, []);
      const staffData = safe(staffRes, (v) => v?.data ?? v, []);
      const departmentData = safe(departmentsRes, (v) => v?.data ?? v, []);
      const gm = safe(globalMetrics, (v) => v, null);

      // Build comparisons from live region/hospital lists
      const hospitalComparison = (hospitals || []).map((h: any) => ({
        name: h.name,
        patients: h.active_patients ?? 0,
        occupancy: h.bed_capacity ? Math.round(((h.occupied_beds ?? 0) / h.bed_capacity) * 100) : 0,
      }));
      const regionComparison = (regions || []).map((r: any) => ({
        name: r.name,
        hospitals: r.hospitals_count ?? 0,
        patients: r.total_patients ?? 0,
        value: r.total_patients ?? 0,
      }));

      setAnalyticsData({
        patientData,
        appointmentData,
        revenueData,
        bedOccupancyData,
        staffData,
        departmentData,
        hospitalComparison,
        regionComparison,
        kpiMetrics: {
          totalPatients: gm?.total_patients ?? 0,
          totalAppointments: appointmentData?.reduce?.((sum: number, d: any) => sum + (d.completed ?? 0) + (d.scheduled ?? 0), 0) ?? 0,
          totalRevenue: revenueData?.reduce?.((sum: number, d: any) => sum + (d.revenue ?? 0), 0) ?? 0,
          bedOccupancy: gm?.avg_bed_utilization ?? 0,
          staffUtilization: staffData?.utilization ?? undefined,
          patientSatisfaction: undefined,
          totalRegions: regions.length ?? 0,
          totalHospitals: hospitals.length ?? 0,
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

  const exportData = async (format: 'csv' | 'pdf' | 'json') => {
    if (!analyticsData) return;

    switch (format) {
      case 'json':
        const jsonData = JSON.stringify(analyticsData, null, 2);
        const jsonBlob = new Blob([jsonData], { type: 'application/json' });
        downloadFile(jsonBlob, `super-admin-analytics-${Date.now()}.json`);
        break;

      case 'csv':
        let csv = 'Date,Metric,Value\n';
        analyticsData.patientData.forEach((d: any) => {
          csv += `${d.date},Admissions,${d.admissions}\n`;
        });
        const csvBlob = new Blob([csv], { type: 'text/csv' });
        downloadFile(csvBlob, `super-admin-analytics-${Date.now()}.csv`);
        break;

      case 'pdf':
        try {
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Super Admin Analytics Report', 14, 20);
          doc.setFontSize(10);
          doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
          doc.text('Summary:', 14, 38);
          const metrics = analyticsData.kpiMetrics || {};
          doc.text(`- Patients: ${metrics.totalPatients ?? '-'}`, 20, 46);
          doc.text(`- Appointments: ${metrics.totalAppointments ?? '-'}`, 20, 52);
          doc.text(`- Revenue: ${metrics.totalRevenue ?? '-'}`, 20, 58);
          doc.save(`super-admin-analytics-${Date.now()}.pdf`);
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

  // Chart rendering has been moved to a lazily loaded component (SuperAdminCharts)

  if (loading && !analyticsData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50'}`}>
        <div className="text-center">
          <div className={`inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 mb-4 ${isDark ? 'border-blue-500' : 'border-blue-600'}`}></div>
          <p className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Loading analytics...</p>
        </div>
      </div>
    );
  }
  const hasAnalytics = !!analyticsData && (
    ((analyticsData.patientData?.length || 0) + (analyticsData.appointmentData?.length || 0) + (analyticsData.revenueData?.length || 0) + (analyticsData.bedOccupancyData?.length || 0) + (analyticsData.staffData?.length || 0)) > 0
    || (analyticsData.kpiMetrics && (analyticsData.kpiMetrics.totalPatients || analyticsData.kpiMetrics.totalAppointments || analyticsData.kpiMetrics.totalRevenue))
  )

  if (!loading && !hasAnalytics) {
    return (
      <div className={`min-h-screen p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900' : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50'}`}>
        <div className="max-w-[1200px] mx-auto">
          <NoAnalyticsDataEmptyState onRefresh={fetchAnalytics} />
        </div>
      </div>
    )
  }

  // derive a theme-aware color map used by KPI icons and charts
  const themeColor = (key: string) => {
    const base = BASE_COLOR_MAP[key] || DEFAULT_COLORS[0]
    // light mode: use slightly darker/solid tones; dark mode: slightly lighter/saturated tones
    if (!isDark) {
      return base
    }
    // dark: use brighter, high-contrast colors for better visibility on dark backgrounds
    const darkAdjustments: Record<string, string> = {
      purple: '#C084FC', // purple-400
      blue: '#60A5FA',   // blue-400  
      green: '#4ADE80',  // green-400
      cyan: '#22D3EE',   // cyan-400
      amber: '#FBBF24',  // amber-400
      pink: '#F472B6',   // pink-400
      orange: '#FB923C', // orange-400
      emerald: '#34D399', // emerald-400
    }
    return darkAdjustments[key] || '#60A5FA' // default to blue-400 for visibility
  }

  return (
    <div className={`min-h-screen p-8 ${isDark ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900' : 'bg-gradient-to-br from-white via-blue-50 to-white'}`}>
      <div className="max-w-[1800px] mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className={`text-4xl font-bold mb-2 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Globe className="w-10 h-10" style={{ color: themeColor('purple') }} />
              Global Analytics Dashboard
            </h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-slate-600'}`}>Enterprise-wide insights across all regions and hospitals</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 ${autoRefresh ? 'bg-green-500/10' : (isDark ? 'bg-gray-800/50 text-gray-400 border border-white/10 hover:bg-gray-700/50' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200')}`}
              style={{ borderColor: autoRefresh ? themeColor('green') + '33' : undefined }}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={{ color: autoRefresh ? themeColor('green') : undefined }} />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button onClick={fetchAnalytics} disabled={loading} className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' : 'bg-blue-50 text-sky-600 border border-sky-100 hover:bg-blue-100'}`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: themeColor('blue') }} />
              Refresh
            </button>
            <div className="relative">
              <select onChange={(e) => exportData(e.target.value as any)} className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 appearance-none cursor-pointer ${isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'}`}>
                <option value="">Export Data</option>
                <option value="json">Export JSON</option>
                <option value="csv">Export CSV</option>
                <option value="pdf">Export PDF</option>
              </select>
              <Download className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: themeColor('purple') }} />
            </div>
          </div>
        </motion.div>

        {error && (
          <div className={`px-4 py-3 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/30 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}

        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${isDark ? 'bg-gradient-to-r from-gray-900/90 via-gray-800/80 to-gray-900/90 border border-white/10' : 'bg-white border border-gray-200'} backdrop-blur-xl rounded-2xl p-6 shadow-2xl`}>
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5" style={{ color: themeColor('purple') }} />
            <div className="flex items-center gap-2">
              <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>From:</label>
              <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className={`${isDark ? 'bg-gray-800/50 text-white border border-white/10 focus:ring-purple-500' : 'bg-white text-slate-700 border border-slate-300 focus:ring-blue-500'} text-sm rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent`} />
            </div>
            <div className="flex items-center gap-2">
              <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>To:</label>
              <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className={`${isDark ? 'bg-gray-800/50 text-white border border-white/10 focus:ring-purple-500' : 'bg-white text-slate-700 border border-slate-300 focus:ring-blue-500'} text-sm rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent`} />
            </div>
            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className={`${isDark ? 'bg-gray-800/50 text-white border border-white/10 focus:ring-purple-500' : 'bg-white text-slate-700 border border-slate-300 focus:ring-blue-500'} text-sm rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent`}>
              <option value="all">All Regions</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>{region.name}</option>
              ))}
            </select>
            <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} className={`${isDark ? 'bg-gray-800/50 text-white border border-white/10 focus:ring-purple-500' : 'bg-white text-slate-700 border border-slate-300 focus:ring-blue-500'} text-sm rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent`}>
              <option value="all">All Hospitals</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
              ))}
            </select>
            <select value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)} className={`${isDark ? 'bg-gray-800/50 text-white border border-white/10 focus:ring-purple-500' : 'bg-white text-slate-700 border border-slate-300 focus:ring-blue-500'} text-sm rounded-lg px-3 py-2 focus:ring-2 focus:border-transparent`}>
              <option value="all">All Metrics</option>
              <option value="patients">Patients</option>
              <option value="appointments">Appointments</option>
              <option value="revenue">Revenue</option>
              <option value="beds">Bed Occupancy</option>
              <option value="hospitals">Hospitals</option>
              <option value="regions">Regions</option>
              <option value="staff">Staff Utilization</option>
              <option value="departments">Departments</option>
              <option value="admissions">Admissions</option>
              <option value="discharges">Discharges</option>
              <option value="prescriptions">Prescriptions</option>
            </select>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {analyticsData && [
            { icon: MapPin, label: 'Regions', value: analyticsData.kpiMetrics.totalRegions, color: 'purple' },
            { icon: Building2, label: 'Hospitals', value: analyticsData.kpiMetrics.totalHospitals, color: 'blue' },
            { icon: Users, label: 'Patients', value: analyticsData.kpiMetrics.totalPatients, color: 'green' },
            { icon: Calendar, label: 'Appointments', value: analyticsData.kpiMetrics.totalAppointments, color: 'cyan' },
            { icon: DollarSign, label: 'Revenue', value: analyticsData.kpiMetrics.totalRevenue, color: 'amber', format: (v: number) => `$${Math.round((v ?? 0) / 1000)}K` },
            { icon: Bed, label: 'Bed Occupancy', value: analyticsData.kpiMetrics.bedOccupancy, color: 'pink', format: (v: number) => `${v ?? 0}%` },
            { icon: Activity, label: 'Staff Utilization', value: analyticsData.kpiMetrics.staffUtilization, color: 'orange', nullable: true, format: (v: number | undefined) => (v === undefined ? 'N/A' : `${v}%`) },
            { icon: TrendingUp, label: 'Satisfaction', value: analyticsData.kpiMetrics.patientSatisfaction, color: 'emerald', nullable: true, format: (v: number | undefined) => (v === undefined ? 'N/A' : `${v}%`) },
          ].map((kpi: any, idx: number) => {
            const display = kpi.format ? kpi.format(kpi.value) : kpi.value;
            return (
              <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} className={`${isDark ? 'bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 border-gray-700/50' : 'bg-white border-gray-200'} backdrop-blur-xl border rounded-2xl p-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                {/* Theme-aware icon color */}
                <kpi.icon className="w-6 h-6 mb-2" style={{ color: themeColor(kpi.color) }} />
                <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs mb-1 font-medium`}>{kpi.label}</p>
                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{display}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Grid (lazy-loaded) */}
        {analyticsData && (
          <SuperAdminCharts analyticsData={analyticsData} selectedMetric={selectedMetric} colorsMap={{
            purple: themeColor('purple'),
            blue: themeColor('blue'),
            green: themeColor('green'),
            cyan: themeColor('cyan'),
            amber: themeColor('amber'),
            pink: themeColor('pink'),
            orange: themeColor('orange'),
            emerald: themeColor('emerald'),
            red: '#EF4444',
          }} />
        )}
      </div>
    </div>
  );
}
