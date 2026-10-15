import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Plus, Search, Calendar, User, Compass, HelpCircle, ShieldAlert, BadgeInfo, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PREDEFINED_SLOTS = [
  { label: '10:00 AM – 12:00 PM', start: '10:00', end: '12:00' },
  { label: '12:00 PM – 2:00 PM', start: '12:00', end: '14:00' },
  { label: '3:00 PM – 5:00 PM', start: '15:00', end: '17:00' },
  { label: '5:00 PM – 7:00 PM', start: '17:00', end: '19:00' },
];

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const AdminBatches = () => {
  const { addToast } = useSocket();
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [batchModal, setBatchModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Conflict Checker states
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    batchCode: '',
    course: '',
    assignedFaculty: '',
    mode: 'classroom',
    roomId: '',
    onlineMeetingLink: '',
    recurrencePattern: 'custom',
    weekdays: [],
    startTime: '',
    endTime: '',
    batchStartDate: '',
    batchEndDate: '',
    maxCapacity: '30',
  });

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/batches');
      setBatches(res.data.data?.batches ?? res.data.data ?? []);
    } catch (err) {
      addToast('Error', 'Failed to retrieve batches schedule.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSelectionData = async () => {
    try {
      const [coursesRes, facultyRes] = await Promise.all([
        api.get('/courses'),
        api.get('/users?role=faculty'),
      ]);
      setCourses(coursesRes.data.data);
      setFacultyList(facultyRes.data.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBatches();
    loadSelectionData();
  }, []);

  // Conflict Checking Engine: Runs when timing/faculty/room fields modify
  const conflictCheckTimeoutRef = useRef(null);

  useEffect(() => {
    if (!batchModal) {
      setConflicts([]);
      return;
    }

    const { assignedFaculty, mode, roomId, weekdays, startTime, endTime, batchStartDate, batchEndDate } = formData;
    
    // Ensure all critical scheduling components are selected
    if (
      !assignedFaculty ||
      (mode !== 'online' && !roomId) ||
      weekdays.length === 0 ||
      !startTime ||
      !endTime ||
      !batchStartDate ||
      !batchEndDate
    ) {
      setConflicts([]);
      return;
    }

    // Debounce checks
    if (conflictCheckTimeoutRef.current) clearTimeout(conflictCheckTimeoutRef.current);
    
    conflictCheckTimeoutRef.current = setTimeout(async () => {
      setCheckingConflicts(true);
      try {
        const res = await api.post('/batches/check-conflicts', {
          assignedFaculty,
          mode,
          roomId,
          weekdays,
          startTime,
          endTime,
          batchStartDate,
          batchEndDate,
          _id: selectedBatch?._id,
        });
        setConflicts(res.data.data?.conflicts ?? []);
      } catch (err) {
        console.error('Conflict check failed', err);
      } finally {
        setCheckingConflicts(false);
      }
    }, 600);

    return () => clearTimeout(conflictCheckTimeoutRef.current);
  }, [
    formData.assignedFaculty,
    formData.mode,
    formData.roomId,
    formData.weekdays,
    formData.startTime,
    formData.endTime,
    formData.batchStartDate,
    formData.batchEndDate,
    batchModal,
  ]);

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (conflicts.length > 0) {
      addToast('Schedule Conflict', 'Please resolve timetable overlaps before saving.', 'error');
      return;
    }

    const payload = {
      ...formData,
      maxCapacity: Number(formData.maxCapacity) || 30,
    };

    try {
      if (selectedBatch) {
        await api.patch(`/batches/${selectedBatch._id}`, payload);
        addToast('Updated', 'Batch schedule updated.', 'success');
      } else {
        await api.post('/batches', payload);
        addToast('Created', 'New batch scheduled and lectures generated.', 'success');
      }
      setBatchModal(false);
      resetForm();
      loadBatches();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Action failed.', 'error');
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch? All materialized lectures and student enrollments will be wiped.')) return;
    try {
      await api.delete(`/batches/${batchId}`);
      addToast('Deleted', 'Batch deleted successfully.', 'success');
      loadBatches();
    } catch (err) {
      addToast('Action Failed', 'Could not delete batch.', 'error');
    }
  };

  const handleWeekdayToggle = (day) => {
    const current = [...formData.weekdays];
    if (current.includes(day)) {
      setFormData({ ...formData, weekdays: current.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, weekdays: [...current, day] });
    }
  };

  const handleRecurrenceSelect = (pattern) => {
    let days = [];
    if (pattern === 'weekend') days = ['saturday', 'sunday'];
    else if (pattern === 'saturday-fullday') days = ['saturday'];
    else if (pattern === 'alternate') days = ['monday', 'wednesday', 'friday']; // defaults alternate
    
    setFormData({
      ...formData,
      recurrencePattern: pattern,
      weekdays: days,
    });
  };

  const handleTimingsSelect = (slot) => {
    setFormData({
      ...formData,
      startTime: slot.start,
      endTime: slot.end,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      batchCode: '',
      course: '',
      assignedFaculty: '',
      mode: 'classroom',
      roomId: '',
      onlineMeetingLink: '',
      recurrencePattern: 'custom',
      weekdays: [],
      startTime: '',
      endTime: '',
      batchStartDate: '',
      batchEndDate: '',
      maxCapacity: '30',
    });
    setSelectedBatch(null);
    setConflicts([]);
  };

  const openEditModal = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      batchCode: batch.batchCode,
      course: batch.course?._id || batch.course,
      assignedFaculty: batch.assignedFaculty?._id || batch.assignedFaculty,
      mode: batch.mode,
      roomId: batch.roomId || '',
      onlineMeetingLink: batch.onlineMeetingLink || '',
      recurrencePattern: batch.recurrencePattern,
      weekdays: batch.weekdays || [],
      startTime: batch.startTime,
      endTime: batch.endTime,
      batchStartDate: batch.batchStartDate ? batch.batchStartDate.split('T')[0] : '',
      batchEndDate: batch.batchEndDate ? batch.batchEndDate.split('T')[0] : '',
      maxCapacity: String(batch.maxCapacity || 30),
    });
    setBatchModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Batch Scheduling</h1>
          <p className="text-xs text-slate-400 font-medium">Create batch timetables, configure weekdays, and run automated conflict checking.</p>
        </div>
        <button
          onClick={() => { resetForm(); setBatchModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule Batch
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No lecture batches configured. Click 'Schedule Batch' to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <motion.div
              key={batch._id}
              layout
              className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full capitalize">
                    {batch.mode}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    {batch.batchCode}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base leading-snug">{batch.name}</h3>
                
                {/* Faculty details */}
                <div className="flex items-center gap-2 py-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-amber-400">
                    {batch.assignedFaculty?.fullName?.charAt(0).toUpperCase() || 'F'}
                  </div>
                  <span className="text-xs text-slate-300 font-semibold">{batch.assignedFaculty?.fullName || 'Unassigned'}</span>
                </div>
              </div>

              {/* Timing metadata */}
              <div className="space-y-2 pt-3 border-t border-slate-850 text-slate-400 text-xs leading-relaxed">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-semibold">Course</span>
                  <span className="text-slate-200 font-medium truncate max-w-[180px]">{batch.course?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-semibold">Timings</span>
                  <span className="text-slate-200 font-medium">{batch.startTime} - {batch.endTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-semibold">Capacity</span>
                  <span className="text-slate-200 font-medium">{batch.maxCapacity} students</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1 pt-1.5">
                  {batch.weekdays?.map((d) => (
                    <span key={d} className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-850 text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                      {d.slice(0, 3)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => openEditModal(batch)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-all"
                >
                  Edit Schedule
                </button>
                <button
                  onClick={() => handleDeleteBatch(batch._id)}
                  className="px-3 py-2 bg-slate-900 hover:bg-rose-500/10 border border-slate-850 hover:border-rose-500/20 text-slate-500 hover:text-rose-450 rounded-xl transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* --- Add/Edit Batch Modal (with Conflict Checker sidebar) --- */}
      <AnimatePresence>
        {batchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBatchModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10 flex flex-col lg:flex-row gap-6"
            >
              <div className="absolute top-4 right-4 z-20">
                <button
                  type="button"
                  onClick={() => setBatchModal(false)}
                  className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-full hover:scale-105 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form panel */}
              <form onSubmit={handleSubmitBatch} className="flex-1 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-base">Schedule Batch Timetable</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Define batch details, trainer slots, and date durations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch Code</label>
                    <input
                      type="text"
                      required
                      value={formData.batchCode}
                      onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Course</label>
                    <select
                      required
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Faculty</label>
                    <select
                      required
                      value={formData.assignedFaculty}
                      onChange={(e) => setFormData({ ...formData, assignedFaculty: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Choose Faculty --</option>
                      {facultyList.map((f) => (
                        <option key={f._id} value={f._id}>{f.fullName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mode</label>
                    <select
                      value={formData.mode}
                      onChange={(e) => setFormData({ ...formData, mode: e.target.value, roomId: '', onlineMeetingLink: '' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="classroom">Classroom</option>
                      <option value="online">Online</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    {formData.mode !== 'online' ? (
                      <>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classroom Room ID</label>
                        <input
                          type="text"
                          required
                          value={formData.roomId}
                          onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                          className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Online Link</label>
                        <input
                          type="text"
                          value={formData.onlineMeetingLink}
                          onChange={(e) => setFormData({ ...formData, onlineMeetingLink: e.target.value })}
                          className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Recurrence & Weekdays Selector */}
                <div className="space-y-2 border-t border-slate-850 pt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recurrence Pattern</span>
                  <div className="flex flex-wrap gap-2">
                    {['daily', 'alternate', 'weekend', 'saturday-fullday', 'custom'].map((pattern) => (
                      <button
                        key={pattern}
                        type="button"
                        onClick={() => handleRecurrenceSelect(pattern)}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold capitalize transition-all ${
                          formData.recurrencePattern === pattern
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
                        }`}
                      >
                        {pattern.replace('-', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Weekday boxes */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {WEEKDAYS.map((day) => {
                      const active = formData.weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={formData.recurrencePattern !== 'custom'}
                          onClick={() => handleWeekdayToggle(day)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                            active
                              ? 'bg-slate-800 border-slate-700 text-slate-200'
                              : 'bg-slate-950 border-slate-850/50 text-slate-600'
                          } disabled:opacity-85`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Prefilled timings slots */}
                <div className="space-y-2 border-t border-slate-850 pt-4">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Timings Selection</span>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_SLOTS.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleTimingsSelect(slot)}
                        className="px-2.5 py-1.5 bg-slate-950 border border-slate-850 text-[10px] font-medium text-slate-400 hover:text-white rounded-lg"
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Start Time (24h)</label>
                      <input
                        type="text"
                        required
                        placeholder="HH:MM (e.g. 10:00)"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">End Time (24h)</label>
                      <input
                        type="text"
                        required
                        placeholder="HH:MM (e.g. 12:00)"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Start / End dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-850 pt-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.batchStartDate}
                      onChange={(e) => setFormData({ ...formData, batchStartDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Batch End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.batchEndDate}
                      onChange={(e) => setFormData({ ...formData, batchEndDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Max Capacity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.maxCapacity}
                      onChange={(e) => setFormData({ ...formData, maxCapacity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t border-slate-850 pt-4">
                  <button
                    type="button"
                    onClick={() => setBatchModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={conflicts.length > 0}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Save Batch
                  </button>
                </div>
              </form>

              {/* Conflict Checker Sidebar */}
              <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-white text-sm">Timetable Auditor</h4>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automated validation detects clashes for the trainer and physical classroom on selected days and timings.
                </p>

                {checkingConflicts ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 text-center flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-semibold text-slate-400">Auditing schedule...</span>
                  </div>
                ) : conflicts.length === 0 ? (
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-[11px] font-medium text-emerald-450 leading-relaxed flex items-start gap-2">
                    <BadgeInfo className="w-4 h-4 shrink-0 text-emerald-400" />
                    Schedule is clear! No timetable or classroom conflicts discovered.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conflicts.map((conflict, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-rose-500/10 border border-rose-500/15 text-[10px] font-semibold text-rose-400 rounded-xl leading-relaxed"
                      >
                        {conflict}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBatches;
