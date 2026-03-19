import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    LayoutDashboard, BookOpen, ClipboardList, Trophy, User,
    LogOut, Sun, Moon, Menu, X, Brain, PlayCircle, BarChart2, Shield
} from 'lucide-react';

const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/active-exams', icon: PlayCircle, label: 'Active Exams' },
    { to: '/practice', icon: BookOpen, label: 'Practice' },
    { to: '/exam', icon: ClipboardList, label: 'Exam Mode' },
    { to: '/my-results', icon: BarChart2, label: 'My Results' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/profile', icon: User, label: 'Profile' },
];

export default function StudentLayout() {
    const { user, logout, isPracticeEnabled } = useAuth();
    const { dark, toggle } = useTheme();
    const [open, setOpen] = useState(window.innerWidth > 768);
    const [hideNav, setHideNav] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Overlay */}
            {!hideNav && open && (
                <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
            )}

            {/* Sidebar */}
            {!hideNav && (
                <aside className={`sidebar ${open ? 'open' : 'collapsed'}`} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Logo */}
                    <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="gradient-bg" style={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Brain size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>SmartMCQ</div>
                            <div style={{ fontSize: '0.65rem', color: !isPracticeEnabled ? '#10b981' : '#6366f1', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                {user?.collegeId?.name || (!isPracticeEnabled ? 'Exam Portal' : 'Pro')}
                            </div>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav style={{ flex: 1, padding: '0.75rem' }}>
                        {links.filter(link => {
                            // Practice-only links: visible only when college has practiceMode enabled
                            const practiceOnlyLinks = ['Dashboard', 'Practice', 'Exam Mode', 'Leaderboard'];
                            if (practiceOnlyLinks.includes(link.label)) {
                                return isPracticeEnabled;
                            }
                            // Active Exams and Profile always visible
                            return true;
                        }).map(({ to, icon: Icon, label }) => (
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
                                <div style={{ fontSize: '0.7rem', color: !isPracticeEnabled ? '#10b981' : '#6366f1' }}>
                                    {!isPracticeEnabled ? 'University Candidate' : 'Student'}
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
            )}

            {/* Main */}
            <div className={`main-content ${(hideNav || !open) ? 'full-width' : ''} ${open ? 'sidebar-open' : ''}`} style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Desktop/Mobile Header Toggle */}
                {!hideNav && (
                    <header style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-light)', position: 'sticky', top: 0, zIndex: 20 }}>
                        <button onClick={() => setOpen(!open)} style={{ background: 'rgba(99,102,241,0.08)', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '0.75rem', transition: 'all 0.2s' }}>
                            <Menu size={22} />
                        </button>
                        
                        {/* Centered College & Role */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: 0, padding: '0 1rem' }}>
                            <div style={{ fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: 'var(--text-main)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '400px' }}>
                                {user?.collegeId?.name}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: !isPracticeEnabled ? '#10b981' : '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                <Shield size={10} /> {!isPracticeEnabled ? 'Secure Exam Portal' : 'SmartMCQ Pro'}
                            </div>
                        </div>

                        {/* Placeholder to balance the burger menu width on the left */}
                        <div style={{ width: 38 }} className="desktop-only"></div>

                        {!open && (
                             <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className="gradient-bg" style={{ width: 28, height: 28, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Brain size={16} color="white" />
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>SmartMCQ</span>
                             </div>
                        )}
                    </header>
                )}
                <main style={{ padding: hideNav ? '0' : '1.5rem', flex: 1, maxWidth: hideNav ? 'none' : '1440px', margin: '0 auto', width: '100%' }}>
                    <Outlet context={{ setHideNav }} />
                </main>
                {!hideNav && (
                    <footer style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)', marginTop: 'auto' }}>
                        Developed by <span style={{ fontWeight: 700, color: '#6366f1' }}>M Saad Shaikh</span>
                    </footer>
                )}
            </div>
        </div>
    );
}
