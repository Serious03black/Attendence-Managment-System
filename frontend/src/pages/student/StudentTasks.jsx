import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { ClipboardList, Plus, Eye, Send, Award, Download, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StudentTasks = () => {
  const { addToast } = useSocket();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submission Drawer
  const [submitDrawer, setSubmitDrawer] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/my');
      setTasks(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to load task list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const dataToSend = new FormData();
    dataToSend.append('content', content);
    files.forEach((file) => {
      dataToSend.append('attachments', file);
    });

    try {
      await api.post(`/tasks/${selectedTask._id}/submit`, dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('Submitted', 'Your work has been uploaded successfully.', 'success');
      setSubmitDrawer(false);
      setContent('');
      setFiles([]);
      loadTasks();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Failed to submit assignment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Tasks & Projects</h1>
        <p className="text-xs text-slate-400 font-medium">View worksheets, upload code deliverables, and review grading marks.</p>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No tasks currently assigned to you.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const hasSubmitted = !!task.mySubmission;
            const isGraded = task.mySubmission?.status === 'graded';
            
            return (
              <div key={task._id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded capitalize">
                      {task.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasSubmitted
                        ? isGraded
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                    }`}>
                      {hasSubmitted ? isGraded ? 'Graded' : 'Submitted' : 'Pending'}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug">{task.title}</h3>
                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
                </div>

                {/* Score section */}
                <div className="space-y-2 pt-3 border-t border-slate-850 text-slate-450 text-[11px] font-semibold">
                  <div className="flex justify-between">
                    <span>Due Date</span>
                    <span className="text-slate-200">{new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                  {isGraded ? (
                    <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-1">
                      <div className="flex justify-between font-bold text-emerald-450 text-[10px]">
                        <span>MARKS OBTAINED</span>
                        <span>{task.mySubmission.marksObtained} / {task.maxMarks}</span>
                      </div>
                      {task.mySubmission.feedback && (
                        <p className="text-[10px] text-slate-400 italic mt-1 leading-relaxed">
                          Feedback: "{task.mySubmission.feedback}"
                        </p>
                      )}
                    </div>
                  ) : hasSubmitted ? (
                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[10px] font-semibold text-amber-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 shrink-0" />
                      Pending Review: Grader will award marks soon.
                    </div>
                  ) : null}
                </div>

                {!hasSubmitted && (
                  <button
                    onClick={() => { setSelectedTask(task); setSubmitDrawer(true); }}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Submit Work
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- Submission Drawer --- */}
      <AnimatePresence>
        {submitDrawer && selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSubmitDrawer(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-lg bg-slate-900 border-l border-slate-850 h-full overflow-y-auto p-6 shadow-2xl z-10 flex flex-col space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Submit Assignment</h3>
                <p className="text-slate-400 text-xs mt-0.5">Upload deliverables for {selectedTask.title}.</p>
              </div>

              <form onSubmit={handleSubmitWork} className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submission Text</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Type git repository URLs, hosted website links, or text responses here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attachments</label>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-brand-400 hover:file:bg-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => setSubmitDrawer(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn disabled:opacity-50"
                  >
                    {submitting ? 'Uploading deliverables...' : 'Submit Work'}
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

export default StudentTasks;
