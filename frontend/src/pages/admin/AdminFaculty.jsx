import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';
import { Search, Plus, UserCheck, UserMinus, Edit2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminFaculty = () => {
  const { addToast } = useSocket();
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    employeeId: '',
    specialization: '', // comma-separated strings
    qualification: '',
    experienceYears: '',
    joiningDate: '',
  });

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users?role=faculty&search=${search}&page=${page}&limit=10`);
      setFaculty(res.data.data.users);
      setTotalPages(res.data.data.pages);
    } catch (err) {
      addToast('Error', 'Failed to retrieve instructors roster.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaculty();
  }, [search, page]);

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      const specs = formData.specialization
        ? formData.specialization.split(',').map((s) => s.trim())
        : [];
      
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password || 'Faculty@123',
        phone: formData.phone,
        role: 'faculty',
        facultyDetails: {
          employeeId: formData.employeeId,
          specialization: specs,
          qualification: formData.qualification,
          experienceYears: Number(formData.experienceYears) || 0,
          joiningDate: formData.joiningDate || new Date(),
        },
      });
      addToast('Success', 'Faculty registered successfully.', 'success');
      setAddModal(false);
      resetForm();
      loadFaculty();
    } catch (err) {
      addToast('Registration Failed', err.response?.data?.message || 'Failed to create faculty user.', 'error');
    }
  };

  const handleEditFaculty = async (e) => {
    e.preventDefault();
    try {
      const specs = formData.specialization
        ? formData.specialization.split(',').map((s) => s.trim())
        : [];

      await api.patch(`/users/${selectedFaculty._id}`, {
        fullName: formData.fullName,
        phone: formData.phone,
        facultyDetails: {
          employeeId: formData.employeeId,
          specialization: specs,
          qualification: formData.qualification,
          experienceYears: Number(formData.experienceYears) || 0,
          joiningDate: formData.joiningDate,
        },
      });
      addToast('Updated', 'Faculty information updated.', 'success');
      setEditModal(false);
      resetForm();
      loadFaculty();
    } catch (err) {
      addToast('Update Failed', err.response?.data?.message || 'Failed to update details.', 'error');
    }
  };

  const handleToggleStatus = async (userRecord) => {
    const action = userRecord.isActive ? 'deactivate' : 'reactivate';
    try {
      await api.patch(`/users/${userRecord._id}/${action}`);
      addToast('Status Updated', `Faculty has been ${action}d.`, 'success');
      loadFaculty();
    } catch (err) {
      addToast('Action Failed', 'Could not update user status.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      employeeId: '',
      specialization: '',
      qualification: '',
      experienceYears: '',
      joiningDate: '',
    });
    setSelectedFaculty(null);
  };

  const openEditModal = (userRecord) => {
    setSelectedFaculty(userRecord);
    setFormData({
      fullName: userRecord.fullName,
      email: userRecord.email,
      phone: userRecord.phone || '',
      employeeId: userRecord.facultyDetails?.employeeId || '',
      specialization: userRecord.facultyDetails?.specialization?.join(', ') || '',
      qualification: userRecord.facultyDetails?.qualification || '',
      experienceYears: userRecord.facultyDetails?.experienceYears || '',
      joiningDate: userRecord.facultyDetails?.joiningDate ? userRecord.facultyDetails.joiningDate.split('T')[0] : '',
    });
    setEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Faculty Management</h1>
          <p className="text-xs text-slate-400 font-medium">Provision trainer profiles, add academic specializations, and manage status.</p>
        </div>
        <button
          onClick={() => { resetForm(); setAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/15 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Faculty
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, email or employee ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : faculty.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No instructors registered matching search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/30">
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Specialization</th>
                  <th className="py-3.5 px-6">Experience</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {faculty.map((member) => (
                  <tr key={member._id} className="text-xs hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-300">
                      {member.facultyDetails?.employeeId || 'NO_ID'}
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      <div>{member.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{member.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.facultyDetails?.specialization?.map((spec, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-medium">{member.facultyDetails?.experienceYears || 0} years</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        member.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                      }`}>
                        {member.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(member)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          member.isActive
                            ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/15 hover:border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/15 hover:border-emerald-500/30 text-emerald-400'
                        }`}
                        title={member.isActive ? 'Suspend Instructor' : 'Reactivate Instructor'}
                      >
                        {member.isActive ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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

      {/* Add Modal */}
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
                <h3 className="font-bold text-white text-base">Add New Faculty</h3>
                <p className="text-slate-400 text-xs mt-0.5">Register a trainer profile with employment details.</p>
              </div>

              <form onSubmit={handleCreateFaculty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password (default: Faculty@123)</label>
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Experience (Years)</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Specialization (Comma separated, e.g. React, Python)</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
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
                    Save Instructor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
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
                <h3 className="font-bold text-white text-base">Edit Faculty Details</h3>
                <p className="text-slate-400 text-xs mt-0.5">Modify information for instructor {selectedFaculty?.fullName}.</p>
              </div>

              <form onSubmit={handleEditFaculty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Experience (Years)</label>
                  <input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full bg-slate-955 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Specialization (Comma separated, e.g. React, Python)</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
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
    </div>
  );
};

export default AdminFaculty;
