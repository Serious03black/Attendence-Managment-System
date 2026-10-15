import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Megaphone,
  Bell,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Clock,
  Award,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?unreadOnly=true');
      setNotifications(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications');
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Re-fetch on custom refresh events (fired by socket provider)
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('notification-refresh', handleRefresh);
    return () => window.removeEventListener('notification-refresh', handleRefresh);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      await api.patch(`/notifications/${notif._id}/read`);
      fetchNotifications();
      setNotifOpen(false);
      if (notif.link) navigate(notif.link);
    } catch (err) {
      console.error(err);
    }
  };

  // Sidebar Links Configuration by Role
  const getSidebarLinks = () => {
    const common = [];
    
    if (user.role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Students', path: '/admin/students', icon: Users },
        { name: 'Faculty', path: '/admin/faculty', icon: GraduationCap },
        { name: 'Courses', path: '/admin/courses', icon: BookOpen },
        { name: 'Batches', path: '/admin/batches', icon: Clock },
        { name: 'Announcements', path: '/admin/announcements', icon: Megaphone },
      ];
    }
    
    if (user.role === 'faculty') {
      return [
        { name: 'Dashboard', path: '/faculty', icon: LayoutDashboard },
        { name: 'Batches', path: '/faculty/batches', icon: Clock },
        { name: 'Attendance Queue', path: '/faculty/attendance', icon: FileCheck },
        { name: 'Daily Reports', path: '/faculty/reports', icon: FileSpreadsheet },
        { name: 'Tasks & Grading', path: '/faculty/tasks', icon: ClipboardList },
        { name: 'Announcements', path: '/faculty/announcements', icon: Megaphone },
      ];
    }
    
    if (user.role === 'student') {
      return [
        { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
        { name: 'Attendance', path: '/student/attendance', icon: Calendar },
        { name: 'Timeline Feed', path: '/student/timeline', icon: Clock },
        { name: 'Tasks & Submissions', path: '/student/tasks', icon: ClipboardList },
        { name: 'Reports Profile', path: '/student/profile', icon: Award },
      ];
    }
    
    return common;
  };

  const links = getSidebarLinks();

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* --- Sidebar Desktop --- */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur-md shrink-0">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
            ST
          </div>
          <span className="font-bold text-lg text-white tracking-wide">STI Management</span>
        </div>

        {/* Navigation Node */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/admin' || link.path === '/faculty' || link.path === '/student'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400 capitalize truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* --- Mobile Sidebar Drawer --- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          
          <aside className="relative flex flex-col w-64 max-w-xs bg-slate-900 border-r border-slate-800 animate-fade-in">
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white">
                ST
              </div>
              <span className="font-bold text-lg text-white">STI Management</span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.path === '/admin' || link.path === '/faculty' || link.path === '/student'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-600/10'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </NavLink>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-brand-400">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user.fullName}</p>
                  <p className="text-xs text-slate-400 capitalize truncate">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* --- Main Wrapper --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/10 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            STI Network Live
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Notification trigger button */}
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/50 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-slate-950 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Pop-down */}
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 glass-panel border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-96 z-50">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-bold text-brand-400 hover:text-brand-300 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-slate-850">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-medium">
                      No unread notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotifClick(notif)}
                        className="p-4 hover:bg-slate-900/60 cursor-pointer transition-colors"
                      >
                        <p className="text-xs font-semibold text-slate-200 mb-1 leading-snug">
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-normal mb-1">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Portal */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
