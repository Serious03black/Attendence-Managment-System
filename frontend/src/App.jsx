import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

// Auth Pages
import Login from './pages/Login';

// Admin Portal Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminFaculty from './pages/admin/AdminFaculty';
import AdminCourses from './pages/admin/AdminCourses';
import AdminBatches from './pages/admin/AdminBatches';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';

// Faculty Portal Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyBatches from './pages/faculty/FacultyBatches';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyReports from './pages/faculty/FacultyReports';
import FacultyTasks from './pages/faculty/FacultyTasks';

// Student Portal Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentTimeline from './pages/student/StudentTimeline';
import StudentTasks from './pages/student/StudentTasks';
import StudentProfile from './pages/student/StudentProfile';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Guest/Auth routes */}
            <Route path="/login" element={<Login />} />

            {/* Admin Portal */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={['admin']}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/students" element={<AdminStudents />} />
                      <Route path="/faculty" element={<AdminFaculty />} />
                      <Route path="/courses" element={<AdminCourses />} />
                      <Route path="/batches" element={<AdminBatches />} />
                      <Route path="/announcements" element={<AdminAnnouncements />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Faculty Portal */}
            <Route
              path="/faculty/*"
              element={
                <ProtectedRoute roles={['faculty']}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<FacultyDashboard />} />
                      <Route path="/batches" element={<FacultyBatches />} />
                      <Route path="/attendance" element={<FacultyAttendance />} />
                      <Route path="/reports" element={<FacultyReports />} />
                      <Route path="/tasks" element={<FacultyTasks />} />
                      <Route path="/announcements" element={<AdminAnnouncements />} />
                      <Route path="*" element={<Navigate to="/faculty" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Student Portal */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute roles={['student']}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<StudentDashboard />} />
                      <Route path="/attendance" element={<StudentAttendance />} />
                      <Route path="/timeline" element={<StudentTimeline />} />
                      <Route path="/tasks" element={<StudentTasks />} />
                      <Route path="/profile" element={<StudentProfile />} />
                      <Route path="*" element={<Navigate to="/student" replace />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
