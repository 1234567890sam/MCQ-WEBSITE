import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import StudentLayout from './components/layouts/StudentLayout';
import PublicLayout from './components/layouts/PublicLayout';
import TeacherLayout from './components/layouts/TeacherLayout';
import CollegeAdminLayout from './components/layouts/CollegeAdminLayout';
import SaasAdminLayout from './components/layouts/SaasAdminLayout';

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
import SessionResultPage from './pages/student/SessionResult';
import MyResults from './pages/student/MyResults';
import ActiveExams from './pages/student/ActiveExams';
import TakeExam from './pages/student/TakeExam';

// Teacher pages
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherExams from './pages/teacher/ManageExams';
import CreateExam from './pages/teacher/CreateExam';
import TeacherExamStudents from './pages/teacher/ExamStudents';
import TeacherExamResults from './pages/teacher/ExamResults';
import TeacherExamAnalytics from './pages/teacher/ExamAnalytics';
import TeacherGeneralResults from './pages/teacher/Results';
import TeacherManageQuestions from './pages/teacher/ManageQuestions';
import TeacherUploadQuestions from './pages/teacher/UploadQuestions';

// College Admin pages
import CollegeAdminDashboard from './pages/college-admin/Dashboard';
import CAManageTeachers from './pages/college-admin/ManageTeachers';
import CAManageStudents from './pages/college-admin/ManageStudents';
import CAManageExams from './pages/college-admin/ManageExams';
import CAAnalytics from './pages/college-admin/Analytics';
import CABulkUpload from './pages/college-admin/BulkUpload';
import CAManageQuestions from './pages/college-admin/ManageQuestions';
import CAUploadQuestions from './pages/college-admin/UploadQuestions';
import CAExamSessions from './pages/college-admin/ExamSessions';
import CAExamResults from './pages/college-admin/ExamResults';

// SaaS Admin pages
import SaasDashboard from './pages/saas-admin/Dashboard';
import SaasColleges from './pages/saas-admin/ManageColleges';
import SaasUsers from './pages/saas-admin/GlobalUsers';
import SaasRecovery from './pages/saas-admin/RecoveryPanel';
import SaasCollegeDetails from './pages/saas-admin/CollegeDetails';
import SaasAuditLogs from './pages/saas-admin/AuditLogs';

// ── Route Guards ──────────────────────────────────────────────────────────────
const Spinner = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
    </div>
);

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, user, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
    return children;
};

const GuestRoute = ({ children }) => {
    const { isAuthenticated, getHomePath, loading } = useAuth();
    if (loading) return <Spinner />;
    if (isAuthenticated) return <Navigate to={getHomePath()} replace />;
    return children;
};

/** Blocks access to practice-only routes if college doesn't have practiceMode enabled */
const PracticeRoute = ({ children }) => {
    const { isPracticeEnabled, loading } = useAuth();
    if (loading) return <Spinner />;
    if (!isPracticeEnabled) return <Navigate to="/active-exams" replace />;
    return children;
};

function App() {
    return (
        <Routes>
            {/* ── Public ─────────────────────────────────────────────── */}
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
            </Route>

            {/* ── Student Portal ──────────────────────────────────────── */}
            <Route element={<ProtectedRoute roles={['student']}><StudentLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<PracticeRoute><StudentDashboard /></PracticeRoute>} />
                <Route path="/active-exams" element={<ActiveExams />} />
                <Route path="/take-exam/:id" element={<TakeExam />} />
                <Route path="/practice" element={<PracticeRoute><PracticePage /></PracticeRoute>} />
                <Route path="/exam" element={<PracticeRoute><ExamPage /></PracticeRoute>} />
                <Route path="/result/:attemptId" element={<ResultPage />} />
                <Route path="/my-results" element={<MyResults />} />
                <Route path="/leaderboard" element={<PracticeRoute><LeaderboardPage /></PracticeRoute>} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/session-result/:code" element={<SessionResultPage />} />
            </Route>

            {/* ── Teacher Portal ──────────────────────────────────────── */}
            <Route element={<ProtectedRoute roles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/exams" element={<TeacherExams />} />
                <Route path="/teacher/exams/create" element={<CreateExam />} />
                <Route path="/teacher/results" element={<TeacherGeneralResults />} />
                <Route path="/teacher/questions" element={<TeacherManageQuestions />} />
                <Route path="/teacher/questions/upload" element={<TeacherUploadQuestions />} />
                <Route path="/teacher/exams/:id/students" element={<TeacherExamStudents />} />
                <Route path="/teacher/exams/:id/results" element={<TeacherExamResults />} />
                <Route path="/teacher/exams/:id/analytics" element={<TeacherExamAnalytics />} />
            </Route>

            {/* ── College Admin Portal ────────────────────────────────── */}
            <Route element={<ProtectedRoute roles={['college-admin']}><CollegeAdminLayout /></ProtectedRoute>}>
                <Route path="/college-admin/dashboard" element={<CollegeAdminDashboard />} />
                <Route path="/college-admin/teachers" element={<CAManageTeachers />} />
                <Route path="/college-admin/students" element={<CAManageStudents />} />
                <Route path="/college-admin/students/bulk" element={<CABulkUpload />} />
                <Route path="/college-admin/questions" element={<CAManageQuestions />} />
                <Route path="/college-admin/questions/upload" element={<CAUploadQuestions />} />
                <Route path="/college-admin/exam-sessions" element={<CAExamSessions />} />
                <Route path="/college-admin/exam-sessions/:id/results" element={<CAExamResults />} />
                <Route path="/college-admin/exams" element={<CAManageExams />} />
                <Route path="/college-admin/analytics" element={<CAAnalytics />} />
            </Route>

            {/* ── SaaS Admin Portal ───────────────────────────────────── */}
            <Route element={<ProtectedRoute roles={['saas-admin']}><SaasAdminLayout /></ProtectedRoute>}>
                <Route path="/saas/dashboard" element={<SaasDashboard />} />
                <Route path="/saas/colleges" element={<SaasColleges />} />
                <Route path="/saas/colleges/:id" element={<SaasCollegeDetails />} />
                <Route path="/saas/users" element={<SaasUsers />} />
                <Route path="/saas/recovery" element={<SaasRecovery />} />
                <Route path="/saas/audit-logs" element={<SaasAuditLogs />} />
            </Route>

            {/* ── Fallback ────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
