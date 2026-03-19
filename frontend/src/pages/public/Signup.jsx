import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, User, Eye, EyeOff, Moon, Sun, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

export default function Signup() {
    const { signup } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', collegeId: '' });
    const [colleges, setColleges] = useState([]);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/auth/colleges').then(r => setColleges(r.data.colleges || [])).catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return toast.error('Please fill all fields');
        if (!form.collegeId) return toast.error('Please select your college');
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (form.password !== form.confirm) return toast.error('Passwords do not match');

        setLoading(true);
        try {
            const user = await signup({ name: form.name, email: form.email, password: form.password, collegeId: form.collegeId, role: 'student' });
            toast.success(`Welcome to SmartMCQ Pro, ${user.name}!`);
            navigate('/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Signup failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const strength = form.password.length >= 8 ? 'Strong' : form.password.length >= 6 ? 'Medium' : form.password.length > 0 ? 'Weak' : '';
    const strengthColor = strength === 'Strong' ? '#10b981' : strength === 'Medium' ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: dark ? 'var(--bg-dark)' : '#f8fafc' }}>
            {/* Form panel */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
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

                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Create Account</h2>
                    <p style={{ color: dark ? '#94a3b8' : '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
                        Start your MCQ journey today — completely free
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                            </div>
                        </div>

                        {/* College */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Select College</label>
                            <div style={{ position: 'relative' }}>
                                <Building2 size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <select className="input" value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })} style={{ paddingLeft: '2.5rem', appearance: 'auto' }}>
                                    <option value="">— Select your college —</option>
                                    {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ paddingLeft: '2.5rem', paddingRight: '2.75rem' }} />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {strength && <div style={{ fontSize: '0.75rem', color: strengthColor, marginTop: '0.3rem', fontWeight: 600 }}>Password strength: {strength}</div>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                                <input className="input" type="password" placeholder="Repeat password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} style={{ paddingLeft: '2.5rem', borderColor: form.confirm && form.confirm !== form.password ? '#ef4444' : undefined }} />
                            </div>
                            {form.confirm && form.confirm !== form.password && (
                                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.3rem' }}>Passwords do not match</div>
                            )}
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.875rem', fontSize: '1rem', justifyContent: 'center', width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}>
                            {loading ? 'Creating account...' : (<>Create Account <ArrowRight size={16} /></>)}
                        </button>
                    </form>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                        {['Free forever', 'No card needed', 'Instant access'].map((t) => (
                            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                                <CheckCircle2 size={12} /> {t}
                            </span>
                        ))}
                    </div>

                    <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: dark ? '#94a3b8' : '#64748b' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>
            </div>

            {/* Right visual panel */}
            <div className="desktop-only gradient-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'white', flexDirection: 'column', gap: '1.5rem' }}>
                <Brain size={60} style={{ opacity: 0.9 }} />
                <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center' }}>Join the Smartest<br />Learners</h2>
                <p style={{ opacity: 0.85, textAlign: 'center', lineHeight: 1.7, maxWidth: 360 }}>
                    Over 5,000 students already trust SmartMCQ Pro to prepare for their exams effectively.
                </p>
                {['Practice with 10,000+ curated questions', 'Identify & fix your weak areas', 'Track progress with beautiful analytics', 'Compete on weekly leaderboards'].map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                        <CheckCircle2 size={18} />
                        <span style={{ fontSize: '0.875rem' }}>{f}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
