import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { BookOpen, Calendar, ClipboardList, Megaphone, Bell, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const StudentDashboard = () => {
  const { addToast } = useSocket();
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, annRes] = await Promise.all([
          api.get('/analytics/student-dashboard'),
          api.get('/announcements'),
        ]);
        setData(dashRes.data.data);
        setAnnouncements(annRes.data.data);
      } catch (err) {
        addToast('Error', 'Failed to retrieve student dashboard stats.', 'error');
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

  const enrolledCount = data?.enrollments?.length || 0;
  const pendingCount = data?.pendingAttendanceCount || 0;
  const tasksCount = data?.upcomingTasksCount || 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back!</h1>
        <p className="text-xs text-slate-400 font-medium">Review your learning timeline, complete pending tasks, and mark attendance.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Enrolled Batches</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{enrolledCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-brand-400" />
          </div>
        </div>

        <Link to="/student/attendance" className="glass-card p-6 rounded-2xl flex items-center justify-between hover:scale-101 transition-transform">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Attendance Claims</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{pendingCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-amber-400" />
          </div>
        </Link>

        <Link to="/student/tasks" className="glass-card p-6 rounded-2xl flex items-center justify-between hover:scale-101 transition-transform">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{tasksCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-rose-450" />
          </div>
        </Link>
      </div>

      {/* Enrolled Batches Details list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="font-bold text-white text-base">My Batches Progress</h3>
          <div className="space-y-4">
            {data?.enrollments?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                You are not currently enrolled in any active classes.
              </div>
            ) : (
              data?.enrollments?.map((item) => (
                <div key={item._id} className="p-6 bg-slate-900/40 rounded-2xl border border-slate-850 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base leading-snug">{item.batch?.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-xs font-semibold">
                        <span>Faculty: {item.batch?.assignedFaculty?.fullName}</span>
                        <span>Room: {item.batch?.roomId || 'Online'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                      {item.batch?.batchCode}
                    </span>
                  </div>

                  {/* Syllabus slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Syllabus Completion</span>
                      <span className="text-slate-300">{item.batch?.course?.syllabusCompletionPercent || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-850">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.batch?.course?.syllabusCompletionPercent || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Link
                      to={`/student/timeline?batchId=${item.batch?._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Class timeline <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Announcements feed sidebar */}
        <div className="glass-panel p-6 rounded-2xl h-fit space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-brand-450" /> Announcements
            </h3>
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {announcements.length === 0 ? (
              <div className="text-center text-xs text-slate-500 font-medium py-6">
                No active announcements today.
              </div>
            ) : (
              announcements.slice(0, 5).map((item) => (
                <div key={item._id} className="p-3.5 bg-slate-955 rounded-xl border border-slate-850 space-y-1.5">
                  <h4 className="font-bold text-xs text-white leading-snug">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-3">{item.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
