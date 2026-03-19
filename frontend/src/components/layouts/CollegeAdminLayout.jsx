import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, Users, BookOpen, BarChart3, GraduationCap,
    LogOut, Sun, Moon, Menu, X, Brain, Shield, UserPlus, FileText
} from 'lucide-react';

const links = [
    { to: '/college-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/college-admin/teachers',  icon: GraduationCap,   label: 'Manage Teachers' },
    { to: '/college-admin/students',  icon: Users,           label: 'Manage Students' },
    { to: '/college-admin/questions', icon: BookOpen,        label: 'Question Bank' },
    { to: '/college-admin/exam-sessions', icon: FileText,    label: 'Exam Sessions' },
    { to: '/college-admin/exams',     icon: Shield,          label: 'Teacher Exams' },
    { to: '/college-admin/analytics', icon: BarChart3,       label: 'Analytics' },
];

export default function CollegeAdminLayout() {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const [open, setOpen] = useState(window.innerWidth > 768);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {open && (
                <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
            )}

            <aside className={`sidebar ${open ? 'open' : 'collapsed'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>SmartMCQ</div>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                            {user?.collegeId?.name || 'College Admin'}
                        </div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '0.75rem' }}>
                    {links.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            style={({ isActive }) => isActive ? { color: '#10b981', background: 'rgba(16,185,129,0.08)' } : {}}
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: '0.75rem', background: 'rgba(16,185,129,0.08)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Shield size={10} /> College Admin
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={toggle} className="btn-secondary" style={{ flex: 1, padding: '0.5rem', justifyContent: 'center' }}>
                            {dark ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <button onClick={handleLogout} className="btn-danger" style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                            <LogOut size={14} /> Logout
                        </button>
                    </div>
                </div>
            </aside>

            <div className={`main-content ${open ? 'sidebar-open' : 'full-width'}`} style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-light)', position: 'sticky', top: 0, zIndex: 20 }}>
                    <button onClick={() => setOpen(!open)} style={{ background: 'rgba(16,185,129,0.08)', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.75rem', transition: 'all 0.2s' }}>
                        <Menu size={22} />
                    </button>
                    {!open && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Brain size={16} color="white" />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#10b981' }}>SmartMCQ</span>
                        </div>
                    )}

                    {/* Centered College & Role */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: 0, padding: '0 1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: 'var(--text-main)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '400px' }}>
                            {user?.collegeId?.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                            <Shield size={10} /> College Administrator
                        </div>
                    </div>

                    {/* Placeholder to balance the burger menu width on the left */}
                    <div style={{ width: 38 }} className="desktop-only"></div>
                </header>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                    <Outlet />
                </div>
                <footer style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
                    Developed by <span style={{ fontWeight: 700, color: '#10b981' }}>M Saad Shaikh</span>
                </footer>
            </div>
        </div>
    );
}
