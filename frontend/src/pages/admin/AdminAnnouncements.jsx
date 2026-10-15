import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Megaphone, Plus, Trash2, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminAnnouncements = () => {
  const { addToast } = useSocket();
  const [announcements, setAnnouncements] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    audience: 'all',
    targetBatch: '',
    isPinned: false,
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve announcements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await api.get('/batches');
      setBatches(res.data.data?.batches ?? res.data.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    loadBatches();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', {
        ...formData,
        targetBatch: formData.audience === 'batch' ? formData.targetBatch : undefined,
      });
      addToast('Success', 'Announcement published and distributed.', 'success');
      setModalOpen(false);
      setFormData({ title: '', body: '', audience: 'all', targetBatch: '', isPinned: false });
      loadAnnouncements();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Publish failed.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      addToast('Success', 'Announcement deleted.', 'success');
      loadAnnouncements();
    } catch (err) {
      addToast('Error', 'Failed to delete announcement.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Announcements</h1>
          <p className="text-xs text-slate-400 font-medium">Publish and pin broad announcements or scoped batch alerts.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Roster list */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No active announcements found. Click 'New Announcement' to start.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <motion.div
              key={item._id}
              layout
              className={`p-6 rounded-2xl glass-card relative space-y-3 ${
                item.isPinned ? 'border-brand-500/25 bg-slate-900/60' : ''
              }`}
            >
              {/* Pin indicator */}
              {item.isPinned && (
                <div className="absolute top-6 right-16 flex items-center gap-1 text-[10px] font-bold text-brand-400">
                  <Pin className="w-3.5 h-3.5 fill-brand-400" />
                  PINNED
                </div>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(item._id)}
                className="absolute top-6 right-6 text-slate-500 hover:text-rose-455 transition-colors p-1"
                title="Delete Announcement"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                  Audience: {item.audience} {item.targetBatch ? `(Batch: ${item.targetBatch.name})` : ''}
                </span>
                <h3 className="font-bold text-white text-base leading-snug">{item.title}</h3>
              </div>

              <p className="text-xs text-slate-350 leading-relaxed max-w-3xl whitespace-pre-wrap">{item.body}</p>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-3 border-t border-slate-850/60">
                <span>By: {item.createdBy?.fullName || 'Administrator'}</span>
                <span>{new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- New Announcement Modal --- */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base font-sans">Publish Announcement</h3>
                <p className="text-slate-400 text-xs mt-0.5 font-medium">Broadcast news across the institute portal.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Target Audience</label>
                    <select
                      value={formData.audience}
                      onChange={(e) => setFormData({ ...formData, audience: e.target.value, targetBatch: '' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="all">All Users</option>
                      <option value="faculty">Faculty Only</option>
                      <option value="students">Students Only</option>
                      <option value="batch">Specific Batch</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1 flex items-end">
                    <label className="flex items-center gap-2 py-2 px-1 text-slate-350 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-brand-650 focus:ring-0"
                      />
                      <span className="text-xs font-semibold">Pin Announcement</span>
                    </label>
                  </div>
                </div>

                {formData.audience === 'batch' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Batch</label>
                    <select
                      required
                      value={formData.targetBatch}
                      onChange={(e) => setFormData({ ...formData, targetBatch: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Choose target batch --</option>
                      {batches.map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Body Message</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Publish
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnnouncements;
