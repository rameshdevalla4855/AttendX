import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import VisitorLogin from './pages/VisitorLogin';
import ActivateAccount from './pages/ActivateAccount';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import HodDashboard from './pages/HodDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import VisitorDashboard from './pages/VisitorDashboard';
import ImportData from './pages/ImportData';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

// Redirect helper component
import { useAuth } from './context/AuthContext';
const RootRedirect = () => {
  const { currentUser, userRole, loading, logout } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;

  // Redirect based on role
  if (userRole === 'student') return <Navigate to="/student" replace />;
  if (userRole === 'faculty') return <Navigate to="/faculty" replace />;
  if (userRole === 'security') return <Navigate to="/security" replace />;
  if (userRole === 'hod') return <Navigate to="/hod" replace />;
  if (userRole === 'coordinator') return <Navigate to="/coordinator" replace />;
  if (userRole === 'visitor') return <Navigate to="/visitor-dashboard" replace />;

  return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
      <h1 className="text-2xl font-bold text-red-600">Error: Unknown Role</h1>
      <p className="text-gray-600">User: {currentUser.email}</p>
      <p className="text-gray-500">Role: {userRole ? userRole : 'None (Profile may be missing or offline)'}</p>
      <button
        onClick={logout}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Logout & Try Again
      </button>
    </div>
  );
};

import { HelmetProvider } from 'react-helmet-async';



function App() {


  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/activate" element={<ActivateAccount />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Student Routes */}
            <Route path="/student" element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>} />

            {/* Faculty Routes */}
            <Route path="/faculty" element={<PrivateRoute role="faculty"><FacultyDashboard /></PrivateRoute>} />

            {/* Security Routes */}
            <Route path="/security" element={<PrivateRoute role="security"><SecurityDashboard /></PrivateRoute>} />

            {/* HOD Routes */}
            <Route path="/hod" element={<PrivateRoute role="hod"><HodDashboard /></PrivateRoute>} />
            <Route path="/hod/import" element={<PrivateRoute role="hod"><ImportData /></PrivateRoute>} />

            {/* Coordinator Routes */}
            <Route path="/coordinator" element={<PrivateRoute role="coordinator"><CoordinatorDashboard /></PrivateRoute>} />

            {/* Visitor Routes */}
            <Route path="/visitor-login" element={<VisitorLogin />} />
            <Route path="/visitor-dashboard" element={<PrivateRoute role="visitor"><VisitorDashboard /></PrivateRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
