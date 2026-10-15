import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Search, Plus, UserCheck, UserMinus, Eye, Edit2, ShieldAlert, Award, FileSpreadsheet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminStudents = () => {
  const { addToast } = useSocket();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal States
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [profileDrawer, setProfileDrawer] = useState(null);

  // Selected records
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [profileData, setProfileData] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    rollNumber: '',
    guardianName: '',
    guardianPhone: '',
    dateOfBirth: '',
    address: '',
  });

  const [enrollmentData, setEnrollmentData] = useState({
    batchId: '',
  });

  const [transferData, setTransferData] = useState({
    fromBatchId: '',
    toBatchId: '',
  });

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?role=student&search=${search}&page=${page}&limit=10`);
      setStudents(res.data.data.users);
      setTotalPages(res.data.data.pages);
    } catch (err) {
      addToast('Error', 'Failed to retrieve students roster.', 'error');
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
    loadStudents();
  }, [search, page]);

  useEffect(() => {
    loadBatches();
  }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password || 'Student@123',
        phone: formData.phone,
        role: 'student',
        studentDetails: {
          rollNumber: formData.rollNumber,
          guardianName: formData.guardianName,
          guardianPhone: formData.guardianPhone,
          dateOfBirth: formData.dateOfBirth,
          address: formData.address,
        },
      });
      addToast('Success', 'Student registered successfully.', 'success');
      setAddModal(false);
      resetForm();
      loadStudents();
    } catch (err) {
      addToast('Registration Failed', err.response?.data?.message || 'Failed to create student.', 'error');
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/users/${selectedStudent._id}`, {
        fullName: formData.fullName,
        phone: formData.phone,
        studentDetails: {
          rollNumber: formData.rollNumber,
          guardianName: formData.guardianName,
          guardianPhone: formData.guardianPhone,
          dateOfBirth: formData.dateOfBirth,
          address: formData.address,
        },
      });
      addToast('Updated', 'Student information updated.', 'success');
      setEditModal(false);
      resetForm();
      loadStudents();
    } catch (err) {
      addToast('Update Failed', err.response?.data?.message || 'Failed to update student.', 'error');
    }
  };

  const handleToggleStatus = async (student) => {
    const action = student.isActive ? 'deactivate' : 'reactivate';
    try {
      await api.patch(`/users/${student._id}/${action}`);
      addToast('Status Updated', `Student has been ${action}d.`, 'success');
      loadStudents();
    } catch (err) {
      addToast('Action Failed', 'Could not update user status.', 'error');
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/batches/${enrollmentData.batchId}/enroll`, {
        studentId: selectedStudent._id,
      });
      addToast('Enrolled', 'Student enrolled in batch successfully.', 'success');
      setEnrollModal(false);
      loadStudents();
    } catch (err) {
      addToast('Enrollment Failed', err.response?.data?.message || 'Conflict detected or capacity reached.', 'error');
    }
  };

  const handleTransferStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/batches/transfer-student`, {
        studentId: selectedStudent._id,
        fromBatchId: transferData.fromBatchId,
        toBatchId: transferData.toBatchId,
      });
      addToast('Transferred', 'Student schedule updated successfully.', 'success');
      setTransferModal(false);
      loadStudents();
    } catch (err) {
      addToast('Transfer Failed', err.response?.data?.message || 'Overlap conflict detected.', 'error');
    }
  };

  const viewStudentProfile = async (student) => {
    setSelectedStudent(student);
    try {
      const res = await api.get(`/users/${student._id}/profile`);
      setProfileData(res.data.data);
      setProfileDrawer(true);
    } catch (err) {
      addToast('Failed', 'Failed to retrieve full academic profile.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      rollNumber: '',
      guardianName: '',
      guardianPhone: '',
      dateOfBirth: '',
      address: '',
    });
    setSelectedStudent(null);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      fullName: student.fullName,
      email: student.email,
      phone: student.phone || '',
      rollNumber: student.studentDetails?.rollNumber || '',
      guardianName: student.studentDetails?.guardianName || '',
      guardianPhone: student.studentDetails?.guardianPhone || '',
      dateOfBirth: student.studentDetails?.dateOfBirth ? student.studentDetails.dateOfBirth.split('T')[0] : '',
      address: student.studentDetails?.address || '',
    });
    setEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Management</h1>
          <p className="text-xs text-slate-400 font-medium">Provision student credentials, audit enrollments, and transfer schedules.</p>
        </div>
        <button
          onClick={() => { resetForm(); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email or roll number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No students registered matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                  <th className="py-3.5 px-6">Roll Number</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {students.map((student) => (
                  <tr key={student._id} className="text-xs hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-300">
                      {student.studentDetails?.rollNumber || 'Unassigned'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">{student.fullName}</td>
                    <td className="py-4 px-6 text-slate-400">{student.email}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        student.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {student.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => viewStudentProfile(student)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="View Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(student)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setSelectedStudent(student); setEnrollModal(true); }}
                        className="px-2 py-1.5 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/15 hover:border-brand-500/30 text-brand-400 hover:text-brand-300 text-[10px] font-bold rounded-lg transition-all"
                      >
                        Enroll
                      </button>
                      <button
                        onClick={() => { setSelectedStudent(student); setTransferModal(true); }}
                        className="px-2 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 text-[10px] font-bold rounded-lg transition-all"
                      >
                        Transfer
                      </button>
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          student.isActive
                            ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/15 hover:border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/15 hover:border-emerald-500/30 text-emerald-400'
                        }`}
                        title={student.isActive ? 'Suspend Account' : 'Reactivate Account'}
                      >
                        {student.isActive ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-400 flex items-center px-2">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* --- Add Student Modal --- */}
      <AnimatePresence>
        {addModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Add New Student</h3>
                <p className="text-slate-400 text-xs mt-0.5">Provision a new student account inside the ERP.</p>
              </div>

              <form onSubmit={handleCreateStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password (default: Student@123)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Save Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Edit Student Modal --- */}
      <AnimatePresence>
        {editModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Edit Student Details</h3>
                <p className="text-slate-400 text-xs mt-0.5">Modify profiles information for {selectedStudent?.fullName}.</p>
              </div>

              <form onSubmit={handleEditStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guardian Name</label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guardian Phone</label>
                  <input
                    type="text"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold glow-btn"
                  >
                    Update Details
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Enroll Modal --- */}
      <AnimatePresence>
        {enrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEnrollModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Enroll in Batch</h3>
                <p className="text-slate-400 text-xs mt-0.5">Assign student {selectedStudent?.fullName} to an active lecture batch.</p>
              </div>

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Batch</label>
                  <select
                    required
                    value={enrollmentData.batchId}
                    onChange={(e) => setEnrollmentData({ batchId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose Active Batch --</option>
                    {batches.filter(b => b.status === 'active' || b.status === 'upcoming').map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} ({batch.batchCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setEnrollModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Enroll Student
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Transfer Modal --- */}
      <AnimatePresence>
        {transferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTransferModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md z-10 space-y-6"
            >
              <div>
                <h3 className="font-bold text-white text-base">Transfer Batch</h3>
                <p className="text-slate-400 text-xs mt-0.5">Move student {selectedStudent?.fullName} to a different batch.</p>
              </div>

              <form onSubmit={handleTransferStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source Batch (Transfer From)</label>
                  <select
                    required
                    value={transferData.fromBatchId}
                    onChange={(e) => setTransferData({ ...transferData, fromBatchId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose Current Batch --</option>
                    {batches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} ({batch.batchCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Destination Batch (Transfer To)</label>
                  <select
                    required
                    value={transferData.toBatchId}
                    onChange={(e) => setTransferData({ ...transferData, toBatchId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Choose New Batch --</option>
                    {batches.filter(b => b._id !== transferData.fromBatchId).map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.name} ({batch.batchCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setTransferModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Execute Transfer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- Profile Details Slide-out Drawer --- */}
      <AnimatePresence>
        {profileDrawer && profileData && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setProfileDrawer(false)} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-lg bg-slate-900 border-l border-slate-850 h-full overflow-y-auto p-6 shadow-2xl z-10 flex flex-col space-y-6"
            >
              {/* Drawer Close */}
              <button
                onClick={() => setProfileDrawer(false)}
                className="absolute top-4 left-4 p-2 bg-slate-950 border border-slate-850 text-slate-400 hover:text-white rounded-full hover:scale-105 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Block */}
              <div className="pt-8 text-center flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-brand-600 border-2 border-brand-500/25 flex items-center justify-center font-bold text-2xl text-white">
                  {profileData.student.fullName.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-white text-lg">{profileData.student.fullName}</h3>
                <span className="text-[10px] font-semibold font-mono bg-slate-950 border border-slate-850 px-3 py-1 rounded-full text-slate-400">
                  {profileData.student.studentDetails?.rollNumber || 'NO ROLL'}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Task Graded %</span>
                  <span className="text-2xl font-bold text-brand-400 block mt-1">{profileData.taskCompletionPercentage}%</span>
                </div>
                <div className="glass-card p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Enrolls</span>
                  <span className="text-2xl font-bold text-emerald-400 block mt-1">{profileData.enrollments?.length || 0}</span>
                </div>
              </div>

              {/* Subcomponents list */}
              <div className="space-y-4">
                {/* Attendance Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-brand-400" /> Attendance Percentages
                  </h4>
                  {profileData.attendanceByBatch?.length === 0 ? (
                    <p className="text-[11px] text-slate-500 font-medium">Not enrolled in active batches.</p>
                  ) : (
                    profileData.attendanceByBatch.map((att, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300 truncate max-w-[250px]">{att.batchName}</span>
                        <span className={`px-2 py-0.5 rounded-full ${att.summary.attendancePercentage < 75 ? 'text-rose-400 bg-rose-500/5' : 'text-emerald-400 bg-emerald-500/5'}`}>
                          {att.summary.attendancePercentage}%
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Evaluations */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Trainer Evaluations
                  </h4>
                  {profileData.facultyReports?.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-medium border border-slate-850 rounded-xl">
                      No review reports filed for this student yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profileData.facultyReports.map((report) => (
                        <div key={report._id} className="p-4 bg-slate-955 rounded-xl border border-slate-850 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-slate-400">{report.reportPeriod}</span>
                            <span className="font-bold text-brand-400 bg-brand-500/5 px-2 py-0.5 rounded">
                              Score: {report.overallPerformance}/10
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 italic">"{report.summary}"</p>
                          <p className="text-[10px] text-slate-500 font-semibold text-right">- {report.reportedBy?.fullName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Submissions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Recent Submissions
                  </h4>
                  {profileData.recentSubmissions?.length === 0 ? (
                    <p className="text-[11px] text-slate-500 font-medium">No tasks submitted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {profileData.recentSubmissions.map((sub) => (
                        <div key={sub._id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-850 flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-semibold truncate max-w-[200px]">{sub.task?.title}</span>
                          <span className={`font-mono font-bold ${sub.status === 'graded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {sub.status === 'graded' ? `${sub.marksObtained}/${sub.task?.maxMarks}` : 'Ungraded'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminStudents;
