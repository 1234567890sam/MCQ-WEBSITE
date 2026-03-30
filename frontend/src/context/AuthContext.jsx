import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) fetchMe();
        else setLoading(false);
    }, []);

    const fetchMe = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
        } catch (err) {
            // If it's a token-expired error, try to refresh first
            if (err?.response?.data?.code === 'TOKEN_EXPIRED') {
                try {
                    const { data: refreshData } = await api.post('/auth/refresh', {}, { withCredentials: true });
                    localStorage.setItem('accessToken', refreshData.accessToken);
                    // Retry /me with new token
                    const { data } = await api.get('/auth/me');
                    setUser(data.user);
                } catch {
                    localStorage.removeItem('accessToken');
                    setUser(null);
                }
            } else {
                localStorage.removeItem('accessToken');
                setUser(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const signup = async (payload) => {
        const { data } = await api.post('/auth/signup', payload);
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const logout = useCallback(async () => {
        try { await api.post('/auth/logout'); } catch { }
        localStorage.removeItem('accessToken');
        setUser(null);
        toast.success('Logged out successfully');
    }, []);

    // Role helpers
    const isAuthenticated = !!user;
    const isStudent       = user?.role === 'student';
    const isTeacher       = user?.role === 'teacher';
    const isCollegeAdmin  = user?.role === 'college-admin';
    const isSaasAdmin     = user?.role === 'saas-admin';
    // Legacy compat
    const isAdmin = isCollegeAdmin || isSaasAdmin;

    // Practice mode: true only if SaaS admin enabled it for this college
    const isPracticeEnabled = !!(user?.collegeId?.features?.practiceMode);

    // Legacy: isExamStudent was used before practiceMode flag — keep for compat
    const isExamStudent = isStudent && !isPracticeEnabled;

    /** Returns the default redirect path for the user's role */
    const getHomePath = () => {
        if (isSaasAdmin)    return '/saas/dashboard';
        if (isCollegeAdmin) return '/college-admin/dashboard';
        if (isTeacher)      return '/teacher/dashboard';
        // Students always land on Active Exams tab directly
        return '/active-exams';
    };

    return (
        <AuthContext.Provider value={{
            user, loading, login, signup, logout, refreshUser: fetchMe,
            isAuthenticated, isStudent, isTeacher, isCollegeAdmin, isSaasAdmin,
            isAdmin, isExamStudent, isPracticeEnabled,
            getHomePath,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
