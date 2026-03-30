import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, User, Eye, EyeOff, Moon, Sun, ArrowRight, CheckCircle2, Building2, Hash, GraduationCap, Layout } from 'lucide-react';

export default function Signup() {
    const { signup } = useAuth();
    const { dark, toggle } = useTheme();
    const navigate = useNavigate();
    const [form, setForm] = useState({ 
        name: '', email: '', password: '', confirm: '', 
        collegeId: '', studentId: '', semester: '', department: '' 
    });
    const [colleges, setColleges] = useState([]);
    const [availableDepartments, setAvailableDepartments] = useState([]);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/auth/colleges')
            .then(r => setColleges(r.data.colleges || []))
            .catch(() => {});
    }, []);

    // Update departments when college changes
    useEffect(() => {
        if (form.collegeId) {
            const college = colleges.find(c => c._id === form.collegeId);
            setAvailableDepartments(college?.departments || []);
            setForm(prev => ({ ...prev, department: '' })); // Reset department
        } else {
            setAvailableDepartments([]);
            setForm(prev => ({ ...prev, department: '' }));
        }
    }, [form.collegeId, colleges]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!form.name || !form.email || !form.password) return toast.error('Please fill all account fields');
        if (!form.collegeId) return toast.error('Please select your college');
        if (!form.studentId) return toast.error('Please enter your Enrollment Number');
        if (!form.semester) return toast.error('Please select your current semester');
        if (!form.department) return toast.error('Please select your department');
        
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (form.password !== form.confirm) return toast.error('Passwords do not match');

        setLoading(true);
        try {
            const user = await signup({ 
                name: form.name, 
                email: form.email, 
                password: form.password, 
                collegeId: form.collegeId,
                studentId: form.studentId,
                semester: form.semester,
                department: form.department,
                role: 'student' 
            });
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

    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: dark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: dark ? 'var(--bg-dark)' : '#f8fafc' }}>
            {/* Form panel */}
            <div style={{ flex: '0 0 auto', width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 3rem', position: 'relative', overflowY: 'auto' }}>
                <button onClick={toggle} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div className="gradient-bg" style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Brain size={20} color="white" />
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '1rem' }}>SmartMCQ Pro</span>
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Student Registration</h2>
                    <p style={{ color: dark ? '#94a3b8' : '#64748b', marginBottom: '2rem', fontSize: '0.85rem' }}>
                        Create your academic profile to start practicing
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Section 1: Account Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Academic Info */}
                        <div style={{ padding: '1.25rem', background: dark ? 'rgba(255,255,255,0.03)' : '#f1f5f9', borderRadius: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>College / Institution</label>
                                <div style={{ position: 'relative' }}>
                                    <Building2 size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <select className="input" value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })} style={{ paddingLeft: '2.5rem', appearance: 'auto' }}>
                                        <option value="">— Select College —</option>
                                        {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Department</label>
                                <div style={{ position: 'relative' }}>
                                    <Layout size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!form.collegeId} style={{ paddingLeft: '2.5rem', appearance: 'auto' }}>
                                        <option value="">— Select Department —</option>
                                        {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Semester</label>
                                <div style={{ position: 'relative' }}>
                                    <GraduationCap size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <select className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} style={{ paddingLeft: '2.5rem', appearance: 'auto' }}>
                                        <option value="">— Sem —</option>
                                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Enrollment No.</label>
                                <div style={{ position: 'relative' }}>
                                    <Hash size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" type="text" placeholder="ID Number" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Password */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 chars" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} />
                                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Confirm</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" type="password" placeholder="Repeat" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '1rem', fontSize: '1rem', justifyContent: 'center', width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '1rem' }}>
                            {loading ? 'Creating your account...' : (<>Complete Registration <ArrowRight size={18} /></>)}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: dark ? '#94a3b8' : '#64748b' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none', borderBottom: '2px solid rgba(99,102,241,0.2)' }}>Sign in instead</Link>
                    </p>
                </div>
            </div>

            {/* Right visual panel */}
            <div className="desktop-only gradient-bg" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'white', flexDirection: 'column', gap: '2rem', overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: -40, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
                    <Brain size={80} style={{ position: 'relative' }} />
                </div>
                
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.2 }}>Start Your Academic<br />Edge Today</h2>
                    <p style={{ opacity: 0.8, fontSize: '1.1rem', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                        Track your performance, practice specific subjects, and excel in your university exams.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 460 }}>
                    {[
                        { icon: GraduationCap, t: 'Exam Ready', p: 'Curated by faculty' },
                        { icon: CheckCircle2, t: 'Instant Results', p: 'Auto-graded tests' },
                        { icon: Layout, t: 'Topic Wise', p: 'Subject practice' },
                        { icon: User, t: 'Free Access', p: 'For all students' }
                    ].map((f) => (
                        <div key={f.t} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <f.icon size={24} style={{ marginBottom: '0.75rem' }} />
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{f.t}</div>
                            <div style={{ opacity: 0.7, fontSize: '0.75rem' }}>{f.p}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
