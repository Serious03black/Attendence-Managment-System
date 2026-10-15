import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { User, Mail, Phone, Calendar, MapPin, Award, Star, ListTodo, GraduationCap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentProfile = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/users/${user._id}/profile`);
        setProfile(res.data.data);
      } catch (err) {
        addToast('Error', 'Failed to retrieve profile history.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="p-6 md:p-8 rounded-2xl glass-panel relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-600 border border-brand-500/25 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-brand-500/10">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white leading-snug">{user.fullName}</h2>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 bg-slate-950 border border-slate-850 rounded text-slate-400">
                Roll: {profile?.student?.studentDetails?.rollNumber || 'NO-ROLL'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-450 rounded-full border border-emerald-500/10">
                ACTIVE STUDENT
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-center text-xs font-semibold">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Task Graded</span>
            <span className="text-xl font-bold text-brand-400 block mt-1">{profile?.taskCompletionPercentage}%</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Class Enrolls</span>
            <span className="text-xl font-bold text-emerald-400 block mt-1">{profile?.enrollments?.length || 0}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Details card */}
        <div className="glass-panel p-6 rounded-2xl space-y-6 h-fit">
          <h3 className="font-bold text-white text-sm flex items-center gap-1.5 pb-3 border-b border-slate-850">
            <User className="w-4 h-4 text-brand-400" /> Account Particulars
          </h3>
          <div className="space-y-4 text-xs font-semibold text-slate-350">
            <div className="flex items-center gap-3">
              <Mail className="w-4.5 h-4.5 text-slate-500" />
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Email</span>
                <span className="text-slate-200 mt-0.5">{profile?.student?.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4.5 h-4.5 text-slate-500" />
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Phone</span>
                <span className="text-slate-200 mt-0.5">{profile?.student?.phone || 'Unrecorded'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4.5 h-4.5 text-slate-500" />
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Date of Birth</span>
                <span className="text-slate-200 mt-0.5">
                  {profile?.student?.studentDetails?.dateOfBirth
                    ? new Date(profile.student.studentDetails.dateOfBirth).toLocaleDateString()
                    : 'Unrecorded'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4.5 h-4.5 text-slate-500" />
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Address Location</span>
                <span className="text-slate-200 mt-0.5 leading-relaxed">
                  {profile?.student?.studentDetails?.address || 'Unrecorded'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluations Card list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 pb-3 border-b border-slate-850">
              <Award className="w-4 h-4 text-amber-400" /> Trainer Evaluations
            </h3>

            {profile?.facultyReports?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                No evaluation cards issued yet.
              </div>
            ) : (
              <div className="space-y-4">
                {profile?.facultyReports?.map((report) => (
                  <div key={report._id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400">{report.reportPeriod}</span>
                      <span className="font-bold text-brand-400 bg-brand-500/5 border border-brand-500/10 px-2 py-0.5 rounded">
                        Performance: {report.overallPerformance}/10
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{report.summary}"
                    </p>

                    {/* Score indicators grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-850/60 text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      <div>
                        Coding Speed: <span className="text-brand-400">{report.codingSkills}/10</span>
                      </div>
                      <div>
                        Programming: <span className="text-brand-400">{report.programmingAbility}/10</span>
                      </div>
                      <div>
                        Confidence: <span className="text-brand-400">{report.confidence}/10</span>
                      </div>
                      <div>
                        Discipline: <span className="text-brand-400">{report.attendanceDiscipline}/10</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-semibold text-right">- trainer {report.reportedBy?.fullName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificates panel */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 pb-3 border-b border-slate-850">
              <GraduationCap className="w-4.5 h-4.5 text-emerald-455" /> Academic Certificates
            </h3>
            
            {profile?.taskCompletionPercentage >= 80 ? (
              <div className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                    MERN Developer Certification <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </h4>
                  <p className="text-slate-400 font-medium">Awarded for maintaining task grades above 80% weightage.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">EARNED</span>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-850 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-350 text-sm">MERN Developer Certification</h4>
                  <p className="text-slate-500 font-medium">Maintains grades above 80% to unlock your professional certificate.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-600 font-mono">LOCKED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
