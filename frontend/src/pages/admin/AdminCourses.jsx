import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Plus, Book, Trash2, Edit2, CheckCircle2, ListTodo, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminCourses = () => {
  const { addToast } = useSocket();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [courseModal, setCourseModal] = useState(false);
  const [syllabusModal, setSyllabusModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    durationWeeks: '',
    category: 'IT',
    fee: '',
  });

  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/courses');
      setCourses(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve course catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleSubmitCourse = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      durationWeeks: Number(formData.durationWeeks),
      fee: Number(formData.fee) || 0,
    };

    try {
      if (selectedCourse) {
        await api.patch(`/courses/${selectedCourse._id}`, payload);
        addToast('Updated', 'Course updated successfully.', 'success');
      } else {
        await api.post('/courses', payload);
        addToast('Created', 'New course catalog entry added.', 'success');
      }
      setCourseModal(false);
      resetForm();
      loadCourses();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Action failed.', 'error');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      addToast('Deleted', 'Course removed from directory.', 'success');
      loadCourses();
    } catch (err) {
      addToast('Delete Failed', 'Course may have associated active batches.', 'error');
    }
  };

  const openSyllabusModal = (course) => {
    setSelectedCourse(course);
    setSyllabusTopics(course.syllabus || []);
    setSyllabusModal(true);
  };

  const handleAddSyllabusTopic = () => {
    if (!newTopicTitle.trim()) return;
    const newTopic = {
      title: newTopicTitle.trim(),
      isCompleted: false,
      order: syllabusTopics.length + 1,
    };
    setSyllabusTopics([...syllabusTopics, newTopic]);
    setNewTopicTitle('');
  };

  const handleRemoveSyllabusTopic = (index) => {
    setSyllabusTopics(syllabusTopics.filter((_, i) => i !== index));
  };

  const handleSaveSyllabus = async () => {
    try {
      await api.put(`/courses/${selectedCourse._id}/syllabus`, {
        syllabus: syllabusTopics,
      });
      addToast('Saved', 'Syllabus topics list updated.', 'success');
      setSyllabusModal(false);
      loadCourses();
    } catch (err) {
      addToast('Error', 'Failed to update course syllabus.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      durationWeeks: '',
      category: 'IT',
      fee: '',
    });
    setSelectedCourse(null);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      description: course.description || '',
      durationWeeks: course.durationWeeks,
      category: course.category || 'IT',
      fee: course.fee || 0,
    });
    setCourseModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Course Directory</h1>
          <p className="text-xs text-slate-400 font-medium">Define curriculum profiles, duration specs, tuition structures, and syllabus indices.</p>
        </div>
        <button
          onClick={() => { resetForm(); setCourseModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No courses created in directory. Click 'Add Course' to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <motion.div
              key={course._id}
              layout
              className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                    {course.code}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 capitalize">{course.category}</span>
                </div>
                <h3 className="font-bold text-white text-base leading-snug">{course.name}</h3>
                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">{course.description || 'No description provided.'}</p>
              </div>

              {/* Progress and metadata */}
              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-300">{course.durationWeeks} weeks</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">Tuition Fee</span>
                  <span className="text-slate-300">INR {course.fee?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-slate-500">Syllabus Completion</span>
                  <span className="text-brand-400">{course.syllabusCompletionPercent || 0}% Complete</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openSyllabusModal(course)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-[10px] font-bold text-slate-300 transition-all"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Syllabus ({course.syllabus?.length || 0})
                </button>
                <button
                  onClick={() => openEditModal(course)}
                  className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCourse(course._id)}
                  className="p-2 bg-slate-900 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- Create/Edit Course Modal --- */}
      <AnimatePresence>
        {courseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCourseModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">
                  {selectedCourse ? 'Edit Course Catalog' : 'Create Course profile'}
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Enter details regarding this qualification program.</p>
              </div>

              <form onSubmit={handleSubmitCourse} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Course Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Course Code</label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500 uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="IT">IT</option>
                      <option value="Non-IT">Non-IT</option>
                      <option value="Skill Development">Skill Development</option>
                      <option value="Competitive Exam">Competitive Exam</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duration (Weeks)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.durationWeeks}
                      onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fee (INR)</label>
                    <input
                      type="number"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setCourseModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Save Course
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Syllabus Manager Modal --- */}
      <AnimatePresence>
        {syllabusModal && selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSyllabusModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto z-10 space-y-6 flex flex-col"
            >
              <div>
                <h3 className="font-bold text-white text-base">Manage Syllabus</h3>
                <p className="text-slate-400 text-xs mt-0.5">Add, order, and outline modules for {selectedCourse.name}.</p>
              </div>

              {/* Add new topic */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g. Database Design & Normalisation..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSyllabusTopic()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={handleAddSyllabusTopic}
                  className="px-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
                >
                  Add
                </button>
              </div>

              {/* Topics scroll list */}
              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-850 rounded-xl p-3 min-h-[200px]">
                {syllabusTopics.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-medium">
                    No syllabus topics defined. Add topics above.
                  </div>
                ) : (
                  syllabusTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-850 text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-450">
                          {index + 1}
                        </span>
                        <span className="text-slate-200">{topic.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSyllabusTopic(index)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSyllabusModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSyllabus}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                >
                  Save Syllabus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminCourses;
