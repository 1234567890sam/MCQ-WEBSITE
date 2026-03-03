import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
    Brain, Zap, BarChart3, Trophy, Shield, Moon, Sun,
    ArrowRight, CheckCircle2, Star
} from 'lucide-react';

const features = [
    { icon: Brain, title: 'Smart Practice', desc: 'Filter by subject, difficulty & question count. Get instant feedback.' },
    { icon: Zap, title: 'Exam Simulation', desc: 'Timer-based exams with negative marking. Real exam pressure practice.' },
    { icon: BarChart3, title: 'Deep Analytics', desc: 'Track accuracy, weak subjects, trends. Know exactly where to improve.' },
    { icon: Trophy, title: 'Leaderboard', desc: 'Weekly & monthly rankings. Compete with peers and stay motivated.' },
    { icon: Shield, title: 'Secure Platform', desc: 'JWT authentication, rate limiting, and enterprise-grade security.' },
    { icon: Star, title: 'Bookmarks & Retry', desc: 'Bookmark tough questions. Retry wrong answers for targeted revision.' },
];

const stats = [
    { label: 'Questions', value: '10,000+' },
    { label: 'Students', value: '5,000+' },
    { label: 'Subjects', value: '50+' },
    { label: 'Exams Taken', value: '25,000+' },
];

export default function Home() {
    const { dark, toggle } = useTheme();

    return (
        <div style={{ minHeight: '100vh', background: dark ? 'var(--bg-dark)' : 'var(--bg-light)' }}>
            {/* Navbar */}
            <nav className="home-nav" style={{ background: dark ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${dark ? 'var(--border-dark)' : 'var(--border-light)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="gradient-bg" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={18} color="white" />
                    </div>
                    <span className="home-logo-text">SmartMCQ <span className="gradient-text">Pro</span></span>
                </div>
                <div className="home-nav-actions" style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.4rem' }}>
                        {dark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <Link to="/login" className="btn-secondary nav-btn">Login</Link>
                    <Link to="/signup" className="btn-primary nav-btn">Get Started</Link>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ padding: '4rem 1rem 3rem', '@media (minWidth: 768px)': { padding: '5rem 2rem 4rem' }, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Background blobs */}
                <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 60%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-100px', right: '-100px', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent 60%)', pointerEvents: 'none' }} />

                <div className="animate-fade-in" style={{ position: 'relative' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 9999, padding: '0.35rem 1rem', marginBottom: '1.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#6366f1' }}>
                        <Zap size={14} /> Production-Ready SaaS MCQ Platform
                    </div>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem' }}>
                        Master Every <span className="gradient-text">Subject</span><br />with Smart MCQ Practice
                    </h1>
                    <p style={{ fontSize: '1.15rem', color: dark ? '#94a3b8' : '#64748b', maxWidth: 600, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
                        Practice mode, timed exams, detailed analytics, leaderboards, and AI-powered weak-subject detection — all in one premium platform.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/signup" className="btn-primary" style={{ textDecoration: 'none', padding: '0.875rem 2rem', fontSize: '1rem' }}>
                            Start Free <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.875rem 2rem', fontSize: '1rem' }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section style={{ padding: '2rem 1rem', '@media (minWidth: 768px)': { padding: '2rem' }, maxWidth: 900, margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                    {stats.map(({ label, value }) => (
                        <div key={label} className="card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }} className="gradient-text">{value}</div>
                            <div style={{ fontSize: '0.85rem', color: dark ? '#94a3b8' : '#64748b', marginTop: '0.25rem' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section style={{ padding: '3rem 1rem', '@media (minWidth: 768px)': { padding: '4rem 2rem' }, maxWidth: 1100, margin: '0 auto' }}>
                <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                    Everything You Need to <span className="gradient-text">Excel</span>
                </h2>
                <p style={{ textAlign: 'center', color: dark ? '#94a3b8' : '#64748b', marginBottom: '3rem', fontSize: '1rem' }}>
                    A complete learning ecosystem built for serious students and institutions.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={22} color="#6366f1" />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</div>
                            <div style={{ fontSize: '0.875rem', color: dark ? '#94a3b8' : '#64748b', lineHeight: 1.6 }}>{desc}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '4rem 1rem', '@media (minWidth: 768px)': { padding: '4rem 2rem' }, textAlign: 'center' }}>
                <div className="gradient-bg" style={{ borderRadius: '1.5rem', padding: '2.5rem 1.5rem', '@media (minWidth: 768px)': { padding: '3rem 2rem' }, maxWidth: 700, margin: '0 auto', color: 'white' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>Ready to Begin?</h2>
                    <p style={{ opacity: 0.9, marginBottom: '2rem', fontSize: '1rem' }}>
                        Join thousands of students already practicing smarter. Create your free account now.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/signup" style={{ background: 'white', color: '#6366f1', padding: '0.875rem 2rem', borderRadius: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Get Started Free <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                        {['No credit card required', 'Instant access', 'Cancel anytime'].map((t) => (
                            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.85 }}>
                                <CheckCircle2 size={14} /> {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: `1px solid ${dark ? 'var(--border-dark)' : 'var(--border-light)'}`, padding: '1.5rem 1rem', textAlign: 'center', color: dark ? '#64748b' : '#94a3b8', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>© {new Date().getFullYear()} SmartMCQ Pro · Built for learners, by learners</div>
                <div>Developed by <span style={{ fontWeight: 700, color: '#6366f1' }}>M Saad Shaikh</span></div>
            </footer>
        </div>
    );
}
