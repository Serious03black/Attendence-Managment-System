import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { ClipboardList, Plus, Eye, Award, ExternalLink, Download, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FacultyTasks = () => {
  const { addToast } = useSocket();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [taskModal, setTaskModal] = useState(false);
  const [submissionsDrawer, setSubmissionsDrawer] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);

  // Selected Records
  const [selectedTask, setSelectedTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);

  // Form Fields - Create Task
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'assignment',
    batch: '',
    scope: 'batch',
    priority: 'medium',
    difficulty: 'medium',
    deadline: '',
    maxMarks: '100',
    submissionRequirements: 'PDF or Github Link',
  });
  
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields - Grade Submission
  const [gradeForm, setGradeForm] = useState({
    marksObtained: '',
    feedback: '',
    status: 'graded',
  });

  const loadBatches = async () => {
    try {
      const res = await api.get('/batches');
      const batchList = res.data.data?.batches ?? res.data.data ?? [];
      setBatches(batchList);
      if (batchList.length > 0) {
        setSelectedBatchId(batchList[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTasks = async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/tasks/batch/${selectedBatchId}`);
      setTasks(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedBatchId]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const dataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      dataToSend.append(key, formData[key]);
    });
    files.forEach((file) => {
      dataToSend.append('attachments', file);
    });

    try {
      await api.post('/tasks', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('Task Created', 'Task assigned to students.', 'success');
      setTaskModal(false);
      setFormData({
        title: '',
        description: '',
        type: 'assignment',
        batch: selectedBatchId,
        scope: 'batch',
        priority: 'medium',
        difficulty: 'medium',
        deadline: '',
        maxMarks: '100',
        submissionRequirements: 'PDF or Github Link',
      });
      setFiles([]);
      loadTasks();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Failed to create task.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const viewSubmissions = async (task) => {
    setSelectedTask(task);
    try {
      const res = await api.get(`/tasks/${task._id}/submissions`);
      setSubmissions(res.data.data);
      setSubmissionsDrawer(true);
    } catch (err) {
      addToast('Error', 'Failed to fetch task submissions.', 'error');
    }
  };

  const openGradeModal = (sub) => {
    setSelectedSub(sub);
    setGradeForm({
      marksObtained: sub.marksObtained || '',
      feedback: sub.feedback || '',
      status: 'graded',
    });
    setGradeModal(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/tasks/submissions/${selectedSub._id}/grade`, {
        marksObtained: Number(gradeForm.marksObtained),
        feedback: gradeForm.feedback,
        status: gradeForm.status,
      });
      addToast('Graded', 'Submission graded successfully.', 'success');
      setGradeModal(false);
      // Refresh submissions
      viewSubmissions(selectedTask);
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Grading failed.', 'error');
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Task Assignments</h1>
          <p className="text-xs text-slate-400 font-medium">Issue assignments, homework practices, coding projects, and review student grades.</p>
        </div>
        <button
          onClick={() => { setFormData({ ...formData, batch: selectedBatchId }); setTaskModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          Assign Task
        </button>
      </div>

      {/* Select Batch Tab filters */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold text-slate-400">Select Batch:</span>
        <select
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
        >
          {batches.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Tasks listing */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No tasks configured in this batch. Click 'Assign Task' to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task._id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded capitalize">
                    {task.type}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 capitalize">{task.priority} Priority</span>
                </div>
                <h3 className="font-bold text-white text-base leading-snug">{task.title}</h3>
                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{task.description}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-850 text-slate-450 text-[11px] font-semibold">
                <div className="flex justify-between">
                  <span>Marks Weightage</span>
                  <span className="text-slate-200">{task.maxMarks} Marks</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty</span>
                  <span className="text-slate-200 capitalize">{task.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date</span>
                  <span className="text-slate-200">{new Date(task.deadline).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => viewSubmissions(task)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-350 rounded-xl transition-all"
              >
                <ClipboardList className="w-4 h-4 text-brand-400" />
                Audit Submissions
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- Assign Task Modal --- */}
      <AnimatePresence>
        {taskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTaskModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Assign Timed Task</h3>
                <p className="text-slate-400 text-xs mt-0.5">Post a coding project or practice sheet to this batch.</p>
              </div>

              <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Express APIs and Mongoose schemas"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="practice">Practice Questions</option>
                    <option value="project">Mini Project</option>
                    <option value="presentation">Presentation</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Task Scope</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="batch">Entire Batch</option>
                    <option value="individual">Selected Students</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Max Marks weightage</label>
                  <input
                    type="number"
                    required
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submission Deadline</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Difficulty Level</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Enter project specifications or instructions details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attachment Files (Mock templates, PDFs)</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-brand-400 hover:file:bg-slate-800 cursor-pointer"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setTaskModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn disabled:opacity-50"
                  >
                    {submitting ? 'Creating Assignment...' : 'Assign Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Submissions Drawer slide-out --- */}
      <AnimatePresence>
        {submissionsDrawer && selectedTask && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setSubmissionsDrawer(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-lg bg-slate-900 border-l border-slate-850 h-full overflow-y-auto p-6 shadow-2xl z-10 flex flex-col space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Submissions</h3>
                <p className="text-slate-400 text-xs mt-0.5">Students uploads for assignment: {selectedTask.title}</p>
              </div>

              {/* List */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {submissions.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500 font-medium">
                    No submissions uploaded by students yet.
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <div key={sub._id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs text-white">
                          {sub.student?.fullName}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          sub.status === 'graded'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {sub.content || 'No text content provided.'}
                      </p>

                      {sub.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {sub.attachments.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-800 text-[10px] text-brand-400 rounded-lg hover:text-brand-300 font-semibold"
                            >
                              <Download className="w-3 h-3" /> File {i + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-850/60">
                        <span className="text-[10px] font-mono text-slate-550">
                          Marks: {sub.status === 'graded' ? `${sub.marksObtained}/${selectedTask.maxMarks}` : 'N/A'}
                        </span>
                        
                        <button
                          onClick={() => openGradeModal(sub)}
                          className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-[10px] font-bold text-white rounded-lg"
                        >
                          Grade Submission
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Grade Submission Modal --- */}
      <AnimatePresence>
        {gradeModal && selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGradeModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Award Score & Feedback</h3>
                <p className="text-slate-400 text-xs mt-0.5">Input grading evaluation for student {selectedSub.student?.fullName}.</p>
              </div>

              <form onSubmit={handleGradeSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Marks Obtained (Max: {selectedTask?.maxMarks})
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={selectedTask?.maxMarks}
                      value={gradeForm.marksObtained}
                      onChange={(e) => setGradeForm({ ...gradeForm, marksObtained: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                    <select
                      value={gradeForm.status}
                      onChange={(e) => setGradeForm({ ...gradeForm, status: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="graded">Graded</option>
                      <option value="returned-for-revision">Returned for Revision</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feedback Remark</label>
                  <textarea
                    rows={3}
                    placeholder="E.g. Excellent implementation of route filters. Code structure is tidy."
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setGradeModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Grade
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

export default FacultyTasks;
