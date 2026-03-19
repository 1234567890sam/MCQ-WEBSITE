import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, Eye, EyeOff, Moon, Sun, ArrowRight } from 'lucide-react';

export default function Login() {
    const { login, getHomePath } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.email || !form.password) return toast.error('Please fill all fields');
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            toast.success(`Welcome back, ${user.name}!`);
            // Role-based redirect
            const roleRoutes = {
                'saas-admin': '/saas/dashboard',
                'college-admin': '/college-admin/dashboard',
                'teacher': '/teacher/dashboard',
                'student': '/dashboard',
            };
            navigate(roleRoutes[user.role] || '/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed. Please try again.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: dark ? 'var(--bg-dark)' : '#f8fafc' }}>
            {/* Left panel */}
            <div className="desktop-only gradient-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'white', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Brain size={40} color="white" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1rem' }}>SmartMCQ Pro</h1>
                    <p style={{ opacity: 0.85, fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 380 }}>
                        Practice smarter, track your progress, and ace every exam with our intelligent MCQ platform.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 380 }}>
                    {[['10K+', 'Questions'], ['5K+', 'Students'], ['50+', 'Subjects'], ['99%', 'Uptime']].map(([v, l]) => (
                        <div key={l} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{v}</div>
                            <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>{l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right panel — form */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
                <button onClick={toggle} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <div className="gradient-bg" style={{ width: 40, height: 40, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Brain size={22} color="white" />
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>SmartMCQ Pro</span>
                    </div>

                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Welcome back</h2>
                    <p style={{ color: dark ? '#94a3b8' : '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        Enter your credentials to access your account
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: dark ? '#cbd5e1' : '#374151' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    style={{ paddingLeft: '2.5rem' }}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', color: dark ? '#cbd5e1' : '#374151' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input
                                    className="input"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }}
                                    autoComplete="current-password"
                                />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.875rem', fontSize: '1rem', justifyContent: 'center', width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Signing in...' : (<>Sign In <ArrowRight size={16} /></>)}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: dark ? '#94a3b8' : '#64748b' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Create one free</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
