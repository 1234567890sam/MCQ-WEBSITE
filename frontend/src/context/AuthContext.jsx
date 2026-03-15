import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user from stored access token on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            fetchMe();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchMe = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
        } catch {
            localStorage.removeItem('accessToken');
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

    const signup = async (name, email, password, role = 'student') => {
        const { data } = await api.post('/auth/signup', { name, email, password, role });
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch { }
        localStorage.removeItem('accessToken');
        setUser(null);
        toast.success('Logged out successfully');
    }, []);

    const isAdmin = user?.role === 'admin';
    const isStudent = user?.role === 'student';
    const isExamStudent = user?.role === 'exam-student';
    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, isAdmin, isStudent, isExamStudent, isAuthenticated, refreshUser: fetchMe }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
