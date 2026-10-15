import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Clock, Download, ExternalLink, FileText, CalendarDays } from 'lucide-react';

const StudentTimeline = () => {
  const { addToast } = useSocket();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialBatchId = queryParams.get('batchId');

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId || '');
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadInitialData = async () => {
    try {
      const res = await api.get('/analytics/student-dashboard');
      const enrolls = res.data.data.enrollments || [];
      setBatches(enrolls.map(e => e.batch));
      if (enrolls.length > 0 && !initialBatchId) {
        setSelectedBatchId(enrolls[0].batch._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTimeline = async () => {
    if (!selectedBatchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/daily-reports/batch/${selectedBatchId}/timeline`);
      setTimeline(res.data.data);
    } catch (err) {
      addToast('Error', 'Failed to retrieve batch learning timeline.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTimeline();
  }, [selectedBatchId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Learning Timeline</h1>
          <p className="text-xs text-slate-400 font-medium">A chronological history of syllabus coverage, resources, and batch reports.</p>
        </div>

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

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : timeline.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 font-medium glass-panel rounded-2xl">
          No lectures recorded in this batch learning timeline yet.
        </div>
      ) : (
        /* Vertical timeline line */
        <div className="relative border-l border-slate-800 ml-4 pl-8 space-y-8 py-4">
          {timeline.map((report, idx) => (
            <div key={report._id} className="relative">
              {/* Timeline marker */}
              <div className="absolute -left-[41px] top-1.5 w-6 h-6 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-400">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>

              {/* Node Card */}
              <div className="p-6 bg-slate-900/40 border border-slate-850 rounded-2xl space-y-4 max-w-4xl">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base leading-snug">{report.topicCovered}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Session Date: {new Date(report.date).toLocaleDateString(undefined, { dateStyle: 'full' })} ({report.teachingHours} Hours)
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    By: {report.faculty?.fullName}
                  </span>
                </div>

                {report.subtopics && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Concept Details</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{report.subtopics}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-850/60">
                  {report.assignmentsGiven && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Classwork Tasks</span>
                      <p className="text-xs text-slate-350">{report.assignmentsGiven}</p>
                    </div>
                  )}
                  {report.homework && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Homework</span>
                      <p className="text-xs text-slate-355">{report.homework}</p>
                    </div>
                  )}
                </div>

                {/* References and Notes resources */}
                {(report.references || report.attachments?.length > 0) && (
                  <div className="space-y-2 pt-2 border-t border-slate-850/60">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide block">Resources & References</span>
                    <div className="flex flex-wrap gap-2">
                      {report.references && report.references.split(',').map((refLink, i) => (
                        <a
                          key={i}
                          href={refLink.trim()}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-[10px] text-brand-400 font-bold rounded-xl"
                        >
                          <ExternalLink className="w-3 h-3" /> Link {i + 1}
                        </a>
                      ))}

                      {report.attachments?.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-850 hover:border-slate-800 text-[10px] text-emerald-450 font-bold rounded-xl"
                        >
                          <Download className="w-3 h-3" /> Note Sheet {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentTimeline;
