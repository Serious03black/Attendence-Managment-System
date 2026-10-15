import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Calendar, Users, FileCheck, CheckCircle2, ClipboardList, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const FacultyDashboard = () => {
  const { addToast } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/analytics/faculty-dashboard');
        setData(res.data.data);
      } catch (err) {
        addToast('Error', 'Failed to retrieve trainer dashboard stats.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { title: 'My Batches', value: data?.myBatches?.length || 0, icon: Clock, color: '#3d52f5', bg: 'rgba(61, 82, 245, 0.1)' },
    { title: 'Total Students', value: data?.totalStudents || 0, icon: Users, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { title: 'Pending Approvals', value: data?.pendingApprovals || 0, icon: FileCheck, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', path: '/faculty/attendance' },
    { title: 'Ungraded Submissions', value: data?.ungradedSubmissions || 0, icon: ClipboardList, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', path: '/faculty/tasks' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Trainer Dashboard</h1>
        <p className="text-xs text-slate-400 font-medium">Coordinate ongoing batches, approve attendance claims, and review project uploads.</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          const CardContent = (
            <div className="glass-card p-6 rounded-2xl flex items-center justify-between h-full">
              <div className="space-y-1.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{kpi.title}</p>
                <h3 className="text-3xl font-bold text-white tracking-tight">{kpi.value}</h3>
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: kpi.bg }}
              >
                <Icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
            </div>
          );
          
          return kpi.path ? (
            <Link key={idx} to={kpi.path}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="h-full hover:scale-101 transition-transform"
              >
                {CardContent}
              </motion.div>
            </Link>
          ) : (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              {CardContent}
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's classes */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Today's Lecture Schedule</h3>
              <p className="text-slate-400 text-xs mt-0.5">Your sessions scheduled for today.</p>
            </div>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            {data?.todaysLectures?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium border border-dashed border-slate-800 rounded-xl">
                No lectures scheduled for you today.
              </div>
            ) : (
              data?.todaysLectures?.map((lecture) => (
                <div
                  key={lecture._id}
                  className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">{lecture.batch?.name}</h4>
                    <div className="flex gap-4 text-slate-400 font-medium">
                      <span>Timings: {lecture.startTime} - {lecture.endTime}</span>
                      <span>Room: {lecture.roomId || 'Online'}</span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    lecture.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                      : 'bg-brand-500/10 text-brand-400 border border-brand-500/10'
                  }`}>
                    {lecture.status === 'completed' ? 'Completed' : 'Scheduled'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Batches List */}
        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div>
            <h3 className="font-bold text-white text-base">Active Timetables</h3>
            <p className="text-slate-400 text-xs mt-0.5">Quick access to batch materials and lists.</p>
          </div>

          <div className="space-y-4">
            {data?.myBatches?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                No batches assigned.
              </div>
            ) : (
              data?.myBatches?.map((batch) => (
                <Link
                  key={batch._id}
                  to={`/faculty/batches?active=${batch._id}`}
                  className="flex items-center justify-between p-4 bg-slate-955 rounded-xl border border-slate-850 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-white truncate max-w-[180px]">{batch.name}</h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      {batch.batchCode}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
