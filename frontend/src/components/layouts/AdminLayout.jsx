import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, Upload, BookOpen, Users, BarChart3,
    LogOut, Sun, Moon, Menu, X, Brain, Shield, GraduationCap, UserPlus
} from 'lucide-react';

const links = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/upload', icon: Upload, label: 'Upload MCQs' },
    { to: '/admin/questions', icon: BookOpen, label: 'Questions' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/admin/exam-sessions', icon: GraduationCap, label: 'Exam Sessions' },
    { to: '/admin/bulk-students', icon: UserPlus, label: 'Bulk Students' },
];

export default function AdminLayout() {
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

            <aside className={`sidebar ${open ? '' : 'collapsed'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>SmartMCQ</div>
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Admin Panel</div>
                    </div>
                </div>

                <nav style={{ flex: 1, padding: '0.75rem' }}>
                    {links.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={18} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: '0.75rem', background: 'rgba(245,158,11,0.08)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Shield size={10} /> Admin
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

            <div className={`main-content ${open ? '' : 'full-width'}`} style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <header style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-light)', position: 'sticky', top: 0, zIndex: 20 }}>
                    <button onClick={() => setOpen(!open)} style={{ background: 'rgba(245,158,11,0.08)', border: 'none', cursor: 'pointer', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.75rem', transition: 'all 0.2s' }}>
                        <Menu size={22} />
                    </button>
                    {!open && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Brain size={16} color="white" />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f59e0b' }}>SmartMCQ</span>
                        </div>
                    )}
                    <span className="mobile-only" style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.2rem', marginLeft: 'auto' }}>Admin Panel</span>
                </header>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                    <Outlet />
                </div>
                <footer style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
                    Developed by <span style={{ fontWeight: 700, color: '#f59e0b' }}>M Saad Shaikh</span>
                </footer>
            </div>
        </div>
    );
}
