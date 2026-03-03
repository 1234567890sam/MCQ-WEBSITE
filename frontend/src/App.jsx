import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import StudentLayout from './components/layouts/StudentLayout';
import AdminLayout from './components/layouts/AdminLayout';
import PublicLayout from './components/layouts/PublicLayout';

// Public pages
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Signup from './pages/public/Signup';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import PracticePage from './pages/student/Practice';
import ExamPage from './pages/student/Exam';
import ResultPage from './pages/student/Result';
import LeaderboardPage from './pages/student/Leaderboard';
import ProfilePage from './pages/student/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UploadPage from './pages/admin/Upload';
import ManageQuestions from './pages/admin/ManageQuestions';
import ManageUsers from './pages/admin/ManageUsers';
import AnalyticsPage from './pages/admin/Analytics';

// Protected route wrappers
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="spinner" />
    </div>
  );
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      </Route>

      {/* Student */}
      <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/result/:attemptId" element={<ResultPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/upload" element={<UploadPage />} />
        <Route path="/admin/questions" element={<ManageQuestions />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
