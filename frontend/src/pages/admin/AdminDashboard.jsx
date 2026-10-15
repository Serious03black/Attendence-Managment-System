import { useState, useEffect } from 'react';
import api from '../../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Users, GraduationCap, Clock, AlertTriangle, BookOpen, MapPin, CalendarDays, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsRes, trendRes] = await Promise.all([
          api.get('/analytics/admin-dashboard'),
          api.get('/analytics/attendance-trend?months=6'),
        ]);
        setStats(statsRes.data.data);
        setTrend(trendRes.data.data);
      } catch (err) {
        console.error('Failed to load admin dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { title: 'Total Students', value: stats?.totalStudents, icon: Users, color: '#3d52f5', bg: 'rgba(61, 82, 245, 0.1)' },
    { title: 'Active Batches', value: stats?.activeBatches, icon: Clock, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { title: 'Total Faculty', value: stats?.totalFaculty, icon: GraduationCap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { title: 'Pending Attendance approvals', value: stats?.pendingApprovalsCount, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  ];

  // Convert batches status object into array format for bar chart
  const batchChartData = stats?.batchesByStatus
    ? Object.keys(stats.batchesByStatus).map((status) => ({
        name: status.toUpperCase(),
        count: stats.batchesByStatus[status],
      }))
    : [];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Institute Overview</h1>
        <p className="text-xs text-slate-400 font-medium">Real-time statistics and training institute performance analytics.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6 rounded-2xl flex items-center justify-between"
            >
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{kpi.title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{kpi.value || 0}</h3>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: kpi.bg }}
              >
                <Icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Approved Attendance Rate</h3>
            <p className="text-slate-400 text-xs mt-0.5">Average monthly present/late percentages (Approved records).</p>
          </div>
          <div className="h-72">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                No approved attendance records found yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3d52f5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3d52f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tickFormatter={(val) => `Month ${val}`} stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#818cf8', fontSize: '12px' }}
                    labelFormatter={(val) => `Month: ${val}`}
                  />
                  <Area type="monotone" dataKey="attendancePercentage" name="Attendance %" stroke="#3d52f5" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Batches by Status */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Batch Distributions</h3>
            <p className="text-slate-400 text-xs mt-0.5">Current enrollment status of ongoing batches.</p>
          </div>
          <div className="h-72 flex items-center justify-center">
            {batchChartData.length === 0 ? (
              <span className="text-xs text-slate-500 font-medium">No batches created</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#3d52f5" radius={[4, 4, 0, 0]}>
                    {batchChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic list: Upcoming lectures */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">Upcoming Lecture Schedule</h3>
            <p className="text-slate-400 text-xs mt-0.5">Lectures scheduled across the institute for the next 7 days.</p>
          </div>
          <CalendarDays className="w-5 h-5 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          {stats?.upcomingLectures?.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-medium border border-dashed border-slate-800 rounded-xl">
              No lectures scheduled for the next 7 days
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Trainer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Timings</th>
                  <th className="py-3 px-4">Location/Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {stats?.upcomingLectures?.map((lecture) => (
                  <tr key={lecture._id} className="text-xs hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-4 font-semibold text-white">{lecture.batch?.name}</td>
                    <td className="py-4 px-4 font-medium text-slate-300">{lecture.faculty?.fullName}</td>
                    <td className="py-4 px-4 text-slate-400 font-medium">
                      {new Date(lecture.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-medium">
                      {lecture.startTime} - {lecture.endTime}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                        <MapPin className="w-3 h-3 text-brand-400" />
                        {lecture.roomId || 'Online'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
