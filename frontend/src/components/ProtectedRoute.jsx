import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // If not authorized, redirect to their role's base portal path
    const fallbackPath = {
      admin: '/admin',
      faculty: '/faculty',
      student: '/student',
    }[user.role] || '/login';
    
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
