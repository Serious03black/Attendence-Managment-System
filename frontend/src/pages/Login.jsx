import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, Sparkles, Shield, GraduationCap, User } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-8 rounded-3xl relative"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl shadow-brand-500/25 mb-4">
            ST
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-1.5">
            STI ERP Portals <Sparkles className="w-4 h-4 text-brand-400" />
          </h2>
          <p className="text-slate-400 text-xs mt-1 font-medium text-center">
            Smart Training Institute Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@sti.local"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/15 glow-btn disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* --- Quick Logins Panel for Testing --- */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 text-center">
            Quick Logins for Testing
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@sti.local', 'Admin@12345')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-slate-300 flex flex-col items-center gap-1 transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('ramesh@sti.local', 'Faculty@12345')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-slate-300 flex flex-col items-center gap-1 transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              Faculty
            </button>
            <button
              onClick={() => handleQuickLogin('aarav@sti.local', 'Student@12345')}
              className="py-2.5 px-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold text-slate-300 flex flex-col items-center gap-1 transition-all"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Student
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
