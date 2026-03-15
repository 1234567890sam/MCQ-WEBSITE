import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, BookOpen, Target, TrendingUp, AlertTriangle, BarChart3, Layers } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/dashboard').then(({ data }) => setStats(data.stats)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const cards = [
        { label: 'Total Students', value: stats?.totalUsers ?? 0, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
        { label: 'Total Subjects', value: stats?.totalSubjects ?? 0, icon: Layers, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Total Questions', value: stats?.totalQuestions ?? 0, icon: BookOpen, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Total Attempts', value: stats?.totalAttempts ?? 0, icon: Target, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Avg Score', value: `${stats?.avgAccuracy ?? 0}%`, icon: TrendingUp, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Platform overview and analytics</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {cards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={22} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
                
                {/* Highlights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {stats?.mostAttemptedSubject && (
                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart3 size={18} color="#6366f1" /> Most Attempted Subject
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{stats.mostAttemptedSubject._id || 'Unknown'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{stats.mostAttemptedSubject.count} total attempts</div>
                        </div>
                    )}

                    {stats?.hardestSubject && (
                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={18} color="#ef4444" /> Hardest Subject
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{stats.hardestSubject._id || 'Unknown'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{stats.hardestSubject.correctRate?.toFixed(1) || 0}% Correct Answer Rate</div>
                        </div>
                    )}
                </div>

                {/* Subject Distribution (Total questions grouped by subject) */}
                {stats?.subjectDistribution?.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={18} color="#10b981" /> Total Questions by Subject
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {stats.subjectDistribution.sort((a,b) => b.count - a.count).map((s, i) => (
                                <div key={s._id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600 }}>{s._id || 'Unknown'}</span>
                                        <span style={{ color: '#64748b' }}>{s.count} questions</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 9999 }}>
                                        <div style={{ height: '100%', borderRadius: 9999, background: `hsl(${150 - i * 15}, 70%, 50%)`, width: `${Math.min(100, (s.count / (stats.subjectDistribution[0]?.count || 1)) * 100)}%`, transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
