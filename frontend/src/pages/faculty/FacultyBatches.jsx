import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Users, BookOpen, Award, FileSpreadsheet, CheckCircle, CheckCircle2, ChevronRight, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EVAL_CRITERIA = [
  { key: 'communicationSkills', label: 'Communication' },
  { key: 'programmingAbility', label: 'Programming' },
  { key: 'attendanceDiscipline', label: 'Discipline' },
  { key: 'assignmentCompletion', label: 'Assignments' },
  { key: 'codingSkills', label: 'Coding Speed' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'behavior', label: 'Behavioral' },
  { key: 'technicalUnderstanding', label: 'Technical Depth' },
  { key: 'overallPerformance', label: 'Overall Progress' },
];

const FacultyBatches = () => {
  const { addToast } = useSocket();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialActiveBatchId = queryParams.get('active');

  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [evalModal, setEvalModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Evaluation Scores
  const [evalForm, setEvalForm] = useState({
    reportPeriod: 'Monthly Review',
    communicationSkills: 8,
    programmingAbility: 8,
    attendanceDiscipline: 8,
    assignmentCompletion: 8,
    codingSkills: 8,
    confidence: 8,
    behavior: 8,
    technicalUnderstanding: 8,
    overallPerformance: 8,
    summary: '',
  });

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/batches');
      const batchList = res.data.data?.batches ?? res.data.data ?? [];
      setBatches(batchList);
      
      // Auto select batch
      if (batchList.length > 0) {
        const toSelect = initialActiveBatchId 
          ? batchList.find(b => b._id === initialActiveBatchId) || batchList[0]
          : batchList[0];
        selectBatch(toSelect);
      } else {
        setLoading(false);
      }
    } catch (err) {
      addToast('Error', 'Failed to retrieve batches.', 'error');
      setLoading(false);
    }
  };

  const selectBatch = async (batch) => {
    setActiveBatch(batch);
    setLoading(true);
    try {
      // 1. Fetch course details for syllabus progress
      const courseId = batch.course?._id || batch.course;
      const courseRes = await api.get(`/courses/${courseId}`);
      setCourse(courseRes.data.data);

      // 2. Fetch students list and average attendance
      const batchProgressRes = await api.get(`/analytics/batch-progress/${batch._id}`);
      // Fetch students list for this batch
      const studentsRes = await api.get(`/users?role=student&limit=50`);
      // Simulating filtering students enrolled in this batch by querying enrollments in production
      // For this local view, we'll populate all students from user list as a mock enrollment.
      setStudents(studentsRes.data.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleMarkTopicCompleted = async (topicId) => {
    const courseId = course._id;
    try {
      await api.patch(`/courses/${courseId}/syllabus/complete-topic`, { topicId });
      addToast('Success', 'Topic marked as completed.', 'success');
      
      // Reload course syllabus
      const courseRes = await api.get(`/courses/${courseId}`);
      setCourse(courseRes.data.data);
    } catch (err) {
      addToast('Error', 'Failed to update syllabus.', 'error');
    }
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/student-reports', {
        student: selectedStudent._id,
        batch: activeBatch._id,
        ...evalForm,
      });
      addToast('Success', `Filed academic report card for ${selectedStudent.fullName}.`, 'success');
      setEvalModal(false);
      setEvalForm({
        reportPeriod: 'Monthly Review',
        communicationSkills: 8,
        programmingAbility: 8,
        attendanceDiscipline: 8,
        assignmentCompletion: 8,
        codingSkills: 8,
        confidence: 8,
        behavior: 8,
        technicalUnderstanding: 8,
        overallPerformance: 8,
        summary: '',
      });
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Failed to submit report card.', 'error');
    }
  };

  const handleScoreChange = (key, val) => {
    setEvalForm({ ...evalForm, [key]: Number(val) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Batch Operations</h1>
        <p className="text-xs text-slate-400 font-medium">Verify enrollments, complete syllabus topics, and evaluate student progress.</p>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {batches.map((batch) => (
          <button
            key={batch._id}
            onClick={() => selectBatch(batch)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all ${
              activeBatch?._id === batch._id
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/10'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {batch.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !activeBatch ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium">No batches assigned to you.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Syllabus Progress */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-brand-400" /> Syllabus Tracker
              </h3>
              <span className="text-[10px] font-bold text-brand-400 bg-brand-500/5 px-2.5 py-0.5 rounded-full border border-brand-500/10">
                {course?.syllabusCompletionPercent || 0}% Done
              </span>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {course?.syllabus?.map((topic) => (
                <div
                  key={topic._id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                    topic.isCompleted
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 font-medium'
                      : 'bg-slate-950/60 border-slate-850 text-slate-350'
                  }`}
                >
                  <span>{topic.title}</span>
                  {topic.isCompleted ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 fill-emerald-500/10 shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleMarkTopicCompleted(topic._id)}
                      className="px-2.5 py-1 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/15 text-[10px] font-bold text-brand-400 rounded-lg shrink-0"
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enrolled Students list */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-450" /> Student Enrollment ({students.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900/30">
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Roll ID</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {students.map((student) => (
                    <tr key={student._id} className="text-xs hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">{student.fullName}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{student.studentDetails?.rollNumber || 'NO-ROLL'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => { setSelectedStudent(student); setEvalModal(true); }}
                          className="px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 text-[10px] font-bold rounded-lg transition-all"
                        >
                          Evaluate Student
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- Evaluation Modal --- */}
      <AnimatePresence>
        {evalModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEvalModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Write Academic Evaluation</h3>
                <p className="text-slate-400 text-xs mt-0.5">Grade performance scores (1-10) for student {selectedStudent.fullName}.</p>
              </div>

              <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Period</label>
                  <input
                    type="text"
                    required
                    value={evalForm.reportPeriod}
                    onChange={(e) => setEvalForm({ ...evalForm, reportPeriod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Score inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-850 pt-4">
                  {EVAL_CRITERIA.map((crit) => (
                    <div key={crit.key} className="space-y-1 bg-slate-955 p-3 rounded-xl border border-slate-850">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        {crit.label}
                        <span className="text-brand-400 font-bold">{evalForm[crit.key]}/10</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={evalForm[crit.key]}
                        onChange={(e) => handleScoreChange(crit.key, e.target.value)}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1 border-t border-slate-850 pt-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Remarks Summary</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter summary observations regarding student progress, confidence, discipline..."
                    value={evalForm.summary}
                    onChange={(e) => setEvalForm({ ...evalForm, summary: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEvalModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    File Evaluation
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

export default FacultyBatches;
