import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, BookOpen, Target, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/dashboard').then(({ data }) => setStats(data.stats)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const cards = [
        { label: 'Total Students', value: stats?.totalUsers ?? 0, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
        { label: 'Total Questions', value: stats?.totalQuestions ?? 0, icon: BookOpen, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Total Attempts', value: stats?.totalAttempts ?? 0, icon: Target, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Avg Accuracy', value: `${stats?.avgAccuracy ?? 0}%`, icon: TrendingUp, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
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
                {/* Most Attempted Subjects */}
                {stats?.subjectStats?.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={18} color="#6366f1" /> Most Attempted Subjects
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {stats.subjectStats.map((s, i) => (
                                <div key={s._id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600 }}>{s._id || 'Unknown'}</span>
                                        <span style={{ color: '#64748b' }}>{s.count} attempts</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 9999 }}>
                                        <div style={{ height: '100%', borderRadius: 9999, background: `hsl(${240 - i * 30}, 75%, 60%)`, width: `${Math.min(100, (s.count / (stats.subjectStats[0]?.count || 1)) * 100)}%`, transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Hardest Questions */}
                {stats?.hardestQuestions?.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} color="#ef4444" /> Hardest Questions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {stats.hardestQuestions.map((q) => (
                                <div key={q._id} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</p>
                                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                                        <span>Subject: {q.subject}</span>
                                        <span style={{ color: '#ef4444', fontWeight: 700 }}>Wrong rate: {q.wrongRate}%</span>
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
