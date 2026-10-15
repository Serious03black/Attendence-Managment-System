import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { FileCheck, ClipboardList, Check, X, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FacultyAttendance = () => {
  const { addToast } = useSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/pending');
      setRequests(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve attendance approvals.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();

    // Listen for live updates from sockets
    const handleLiveRefresh = () => {
      loadPendingRequests();
    };
    window.addEventListener('attendance-pending-refresh', handleLiveRefresh);
    return () => window.removeEventListener('attendance-pending-refresh', handleLiveRefresh);
  }, []);

  const handleApprove = async (reqId) => {
    try {
      await api.patch(`/attendance/${reqId}/review`, {
        action: 'approve',
      });
      addToast('Approved', 'Attendance marked present.', 'success');
      loadPendingRequests();
    } catch (err) {
      addToast('Error', 'Failed to approve attendance.', 'error');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectRemark.trim()) {
      addToast('Warning', 'A rejection remark is required.', 'warning');
      return;
    }

    try {
      await api.patch(`/attendance/${selectedReq._id}/review`, {
        action: 'reject',
        remark: rejectRemark.trim(),
      });
      addToast('Rejected', 'Attendance request rejected.', 'success');
      setRejectModal(false);
      setSelectedReq(null);
      setRejectRemark('');
      loadPendingRequests();
    } catch (err) {
      addToast('Error', 'Failed to reject attendance.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Approvals</h1>
        <p className="text-xs text-slate-400 font-medium">Verify student-submitted attendance logs and approve active timetables.</p>
      </div>

      {/* Queue list */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-brand-400" /> Pending Approval Queue ({requests.length})
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
            Realtime Active
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-700" />
            No pending attendance claims to review at this moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Student</th>
                  <th className="py-3.5 px-6">Batch</th>
                  <th className="py-3.5 px-6">Class Date</th>
                  <th className="py-3.5 px-6">Self-Marked</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {requests.map((req) => (
                  <tr key={req._id} className="text-xs hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">
                      <div>{req.student?.fullName}</div>
                      <div className="text-[9px] text-slate-500 font-mono font-bold mt-0.5">
                        {req.student?.studentDetails?.rollNumber || 'NO ROLL'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-350">
                      <div>{req.batch?.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{req.batch?.batchCode}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-450">
                      <div>{new Date(req.lecture?.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {req.lecture?.startTime} - {req.lecture?.endTime}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        req.claimedStatus === 'present' || req.claimedStatus === 'late'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : req.claimedStatus === 'leave'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {req.claimedStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(req._id)}
                        className="p-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/30 text-emerald-450 rounded-lg transition-all"
                        title="Approve request"
                      >
                        <Check className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => { setSelectedReq(req); setRejectModal(true); }}
                        className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/30 text-rose-450 rounded-lg transition-all"
                        title="Reject request"
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Reject Remark Modal --- */}
      <AnimatePresence>
        {rejectModal && selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Reject Attendance Request</h3>
                <p className="text-slate-400 text-xs mt-0.5">Please provide a remark explaining the rejection. This becomes visible to the student.</p>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rejection Remark</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g. Student arrived 45 minutes late without prior notice."
                    value={rejectRemark}
                    onChange={(e) => setRejectRemark(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setRejectModal(false); setSelectedReq(null); }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-650 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Reject Claim
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

export default FacultyAttendance;
