import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Brain, Mail, Lock, User, Eye, EyeOff, Moon, Sun, ArrowRight, CheckCircle2, Building2, Hash, GraduationCap, Layout, ShieldCheck } from 'lucide-react';

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

    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem', color: dark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: dark ? 'var(--bg-dark)' : '#f8fafc', color: dark ? 'white' : 'inherit' }}>
            {/* Form panel */}
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
                <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="gradient-bg" style={{ width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(99,102,241,0.2)' }}>
                                <Brain size={22} color="white" />
                            </div>
                            <span style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>SmartMCQ Pro</span>
                        </div>
                        <button onClick={toggle} style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: 'none', cursor: 'pointer', color: 'inherit', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {dark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>

                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Create Student Profile</h2>
                        <p style={{ color: dark ? '#94a3b8' : '#64748b', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                            Register with your academic details for verified access
                        </p>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Account Credentials */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input className="input" type="text" placeholder="e.g. John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ paddingLeft: '2.75rem' }} />
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input className="input" type="email" placeholder="student@university.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ paddingLeft: '2.75rem' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Details (Sectioned) */}
                            <div style={{ padding: '1.5rem', background: dark ? 'rgba(255,255,255,0.025)' : '#f1f5f9', borderRadius: '1.25rem', border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>College / Institution</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building2 size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <select className="input" value={form.collegeId} onChange={(e) => setForm({ ...form, collegeId: e.target.value })} style={{ paddingLeft: '2.75rem', appearance: 'auto' }}>
                                            <option value="">— Select College —</option>
                                            {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Academic Department</label>
                                    <div style={{ position: 'relative' }}>
                                        <Layout size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} disabled={!form.collegeId} style={{ paddingLeft: '2.75rem', appearance: 'auto' }}>
                                            <option value="">— Select Department —</option>
                                            {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Current Semester</label>
                                    <div style={{ position: 'relative' }}>
                                        <GraduationCap size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <select className="input" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} style={{ paddingLeft: '2.75rem', appearance: 'auto' }}>
                                            <option value="">— Sem —</option>
                                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Enrollment / ID No.</label>
                                    <div style={{ position: 'relative' }}>
                                        <Hash size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input className="input" type="text" placeholder="Academic ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} style={{ paddingLeft: '2.75rem' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Verification Security */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 chars" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }} />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={labelStyle}>Confirm</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input className="input" type="password" placeholder="Repeat" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} style={{ paddingLeft: '2.75rem' }} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '1.125rem', fontSize: '1rem', justifyContent: 'center', width: '100%', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '1rem', boxShadow: '0 10px 20px rgba(99,102,241,0.2)' }}>
                                {loading ? 'Verified account creation...' : (<>Complete Registration <ArrowRight size={20} style={{ marginLeft: 6 }} /></>)}
                            </button>
                        </form>

                        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: dark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            <ShieldCheck size={14} color="#10b981" /> Academic verification active
                        </div>

                        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: dark ? '#94a3b8' : '#64748b' }}>
                            Already a student?{' '}
                            <Link to="/login" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>Log in</Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right decorative panel */}
            <div className="desktop-only gradient-bg" style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3rem', color: 'white', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <GraduationCap size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', lineHeight: 1.2 }}>Unlock Your Potential</h3>
                    <p style={{ opacity: 0.8, fontSize: '1rem', lineHeight: 1.6 }}>Join thousands of students enhancing their grades with our personalized MCQ practice system.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {[
                        { title: 'Dynamic Practice', desc: 'Subject-wise curated question banks.' },
                        { title: 'Real-time Analytics', desc: 'Track your strong and weak topics.' },
                        { title: 'Official Exams', desc: 'Secure environment for university tests.' }
                    ].map((f, i) => (
                        <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.08)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{f.title}</div>
                            <div style={{ opacity: 0.7, fontSize: '0.85rem' }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
