import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Calendar as CalendarIcon, CheckCircle, AlertTriangle, AlertCircle, FileText, Download, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentAttendance = () => {
  const { addToast } = useSocket();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [todayLectures, setTodayLectures] = useState([]);
  const [summary, setSummary] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Self Marking Form
  const [markingLec, setMarkingLec] = useState(null);
  const [markingStatus, setMarkingStatus] = useState('present');

  const loadInitialData = async () => {
    try {
      const res = await api.get('/analytics/student-dashboard');
      const enrolls = res.data.data.enrollments || [];
      setBatches(enrolls.map(e => e.batch));
      if (enrolls.length > 0) {
        setSelectedBatchId(enrolls[0].batch._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAttendanceStats = async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-indexed

      // Start/End of current month for calendar query
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

      const [summaryRes, calendarRes, batchRes] = await Promise.all([
        api.get(`/attendance/monthly-summary?batchId=${selectedBatchId}&year=${year}&month=${month}`),
        api.get(`/attendance/calendar?batchId=${selectedBatchId}&startDate=${startDate}&endDate=${endDate}`),
        api.get(`/batches/${selectedBatchId}`),
      ]);

      setSummary(summaryRes.data.data);
      setCalendarDays(calendarRes.data.data);

      // Find any lecture scheduled for today to allow student to mark attendance
      const todayString = new Date().toDateString();
      const batchLectures = batchRes.data.data.lectures || [];
      const scheduledToday = batchLectures.filter((l) => {
        const isToday = new Date(l.date).toDateString() === todayString;
        return isToday && l.status === 'scheduled';
      });

      // Check if student has already marked attendance for these lectures
      const alreadyMarkedRes = await api.get(`/attendance/calendar?batchId=${selectedBatchId}&startDate=${new Date().setHours(0,0,0,0)}&endDate=${new Date().setHours(23,59,59,999)}`);
      const markedMap = new Map(alreadyMarkedRes.data.data.map(d => [d.lecture?._id, d.attendance]));

      const unmarked = scheduledToday.filter(l => !markedMap.get(l._id));
      setTodayLectures(unmarked);

    } catch (err) {
      addToast('Error', 'Failed to retrieve attendance details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAttendanceStats();
  }, [selectedBatchId]);

  const handleSelfMark = async (e) => {
    e.preventDefault();
    if (!markingLec) return;
    
    try {
      // Get location coordinates (mock geolocation for simplicity)
      let location = '12.9716, 77.5946'; // Bangalore
      
      await api.post('/attendance', {
        lectureId: markingLec._id,
        status: markingStatus,
        submittedLocation: location,
      });

      addToast('Success', 'Attendance marked and pending review.', 'success');
      setMarkingLec(null);
      loadAttendanceStats();
    } catch (err) {
      addToast('Error', err.response?.data?.message || 'Submission failed.', 'error');
    }
  };

  const handleDayClick = (day) => {
    setSelectedDayInfo(day);
  };

  // Mock CSV Exporter
  const handleExportCSV = () => {
    if (!summary) return;
    const headers = 'Metric,Value\n';
    const rows = [
      `Total Lectures Conducted,${summary.totalLecturesConducted}`,
      `Lectures Attended,${summary.lecturesAttended}`,
      `Absent Days,${summary.absentDays}`,
      `Leave Days,${summary.leaveDays}`,
      `Pending Requests,${summary.pendingRequests}`,
      `Attendance Percentage,${summary.attendancePercentage}%`,
    ].join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Attendance_Report_Batch_${selectedBatchId}.csv`);
    a.click();
    addToast('Downloaded', 'Attendance CSV file generated.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium">Verify your daily present logs, submit self-marks, and audit monthly margins.</p>
        </div>

        <div className="flex gap-3">
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sub-75% Warning Alert */}
          {summary && summary.belowThreshold && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs font-semibold leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                Attendance Warning: Your approved attendance percentage is currently at{' '}
                <strong className="text-white underline">{summary.attendancePercentage}%</strong>, which is below the
                mandated minimum threshold of 75%. Please ensure you attend all upcoming lectures.
              </div>
            </div>
          )}

          {/* Self-marking Action Card */}
          {todayLectures.length > 0 && (
            <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5 justify-center sm:justify-start">
                  <Navigation className="w-4.5 h-4.5 text-brand-400" /> Active Class Session
                </h4>
                <p className="text-slate-350 text-xs">A lecture is active. Submit your attendance request now.</p>
              </div>

              <div className="flex gap-3">
                <select
                  value={markingStatus}
                  onChange={(e) => setMarkingStatus(e.target.value)}
                  className="bg-slate-950 border border-brand-500/25 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                >
                  <option value="present">Present</option>
                  <option value="late">Late Arrival</option>
                  <option value="leave">Apply Leave</option>
                </select>
                <button
                  onClick={() => { setMarkingLec(todayLectures[0]); }}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
                >
                  Submit Mark
                </button>
              </div>
            </div>
          )}

          {/* Self marking modal */}
          {markingLec && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMarkingLec(null)} />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm z-10 text-center space-y-6"
              >
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-base">Self-Mark Attendance</h4>
                  <p className="text-slate-400 text-xs leading-normal">
                    This will submit a request to the trainer on location: Bangalore.
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setMarkingLec(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSelfMark}
                    className="px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-xl"
                  >
                    Confirm Submission
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* KPI metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="glass-card p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Conducted</span>
              <span className="text-xl font-bold text-white block mt-1">{summary?.totalLecturesConducted}</span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Attended</span>
              <span className="text-xl font-bold text-emerald-450 block mt-1">{summary?.lecturesAttended}</span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Absences</span>
              <span className="text-xl font-bold text-rose-455 block mt-1">{summary?.absentDays}</span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500">Pending Approval</span>
              <span className="text-xl font-bold text-amber-500 block mt-1">{summary?.pendingRequests}</span>
            </div>
            <div className="glass-card p-4 rounded-xl text-center col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Average Rate</span>
              <span className={`text-xl font-bold block mt-1 ${summary?.belowThreshold ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary?.attendancePercentage}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar grid */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Monthly Attendance Calendar</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Click a date cell to review subject coverage and comments.</p>
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <span key={d} className="text-slate-500 py-1.5">{d}</span>
                ))}

                {calendarDays.map((day, idx) => {
                  const hasLecture = day.calendarStatus !== 'no-lecture';
                  const dateObj = new Date(day.date);
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => hasLecture && handleDayClick(day)}
                      className={`h-11 rounded-xl flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform ${
                        day.calendarStatus === 'present'
                          ? 'status-present'
                          : day.calendarStatus === 'absent'
                          ? 'status-absent'
                          : day.calendarStatus === 'pending'
                          ? 'status-pending'
                          : day.calendarStatus === 'leave'
                          ? 'status-leave'
                          : day.calendarStatus === 'holiday'
                          ? 'status-holiday'
                          : 'bg-slate-900/10 text-slate-700'
                      }`}
                    >
                      <span>{dateObj.getDate()}</span>
                      
                      {/* Dot for active lecture */}
                      {hasLecture && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-current" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar Details details */}
            <div className="glass-panel p-6 rounded-2xl h-fit space-y-6">
              <div>
                <h3 className="font-bold text-white text-sm">Session Information</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">Details regarding selected calendar date.</p>
              </div>

              {selectedDayInfo ? (
                <div className="space-y-4 text-xs font-semibold text-slate-350">
                  <div className="pb-3 border-b border-slate-850">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Date</span>
                    <p className="text-slate-200 mt-0.5">
                      {new Date(selectedDayInfo.date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Session Status</span>
                    <p className="text-slate-200 capitalize mt-0.5">{selectedDayInfo.calendarStatus}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Class Timings</span>
                    <p className="text-slate-200 mt-0.5">
                      {selectedDayInfo.lecture?.startTime} - {selectedDayInfo.lecture?.endTime}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Instructor</span>
                    <p className="text-slate-200 mt-0.5">{selectedDayInfo.lecture?.faculty?.fullName}</p>
                  </div>
                  {selectedDayInfo.attendance?.facultyRemark && (
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-850">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Trainer remark</span>
                      <p className="text-slate-300 italic mt-1 leading-relaxed">
                        "{selectedDayInfo.attendance.facultyRemark}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  Select an active lecture date on the calendar grid to audit.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;
