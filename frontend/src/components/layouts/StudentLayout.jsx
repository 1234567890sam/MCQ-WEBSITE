import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, BookOpen, ClipboardList, Trophy, User,
    LogOut, Sun, Moon, Menu, X, Brain
} from 'lucide-react';

const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/practice', icon: BookOpen, label: 'Practice' },
    { to: '/exam', icon: ClipboardList, label: 'Exam Mode' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/profile', icon: User, label: 'Profile' },
];

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Overlay */}
            {open && (
                <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${open ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Logo */}
                <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="gradient-bg" style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>SmartMCQ</div>
                        <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Pro</div>
                    </div>
                </div>

                {/* Nav */}
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

                {/* Bottom */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: '0.75rem', background: 'rgba(99,102,241,0.06)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Student</div>
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

            {/* Main */}
            <div className="main-content" style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {/* Mobile Header */}
                <header className="mobile-only" style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-light)', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card-light)', position: 'sticky', top: 0, zIndex: 20 }}>
                    <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {open ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <span style={{ fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '1.2rem' }}>SmartMCQ Pro</span>
                    <div style={{ width: 24 }} />
                </header>
                <div style={{ padding: '1.5rem', flex: 1 }}>
                    <Outlet />
                </div>
                <footer style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
                    Developed by <span style={{ fontWeight: 700, color: '#6366f1' }}>M Saad Shaikh</span>
                </footer>
            </div>
        </div>
    );
}
