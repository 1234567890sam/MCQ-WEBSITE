import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BarChart3, TrendingUp, Users, Target, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CollegeAnalytics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/college-admin/analytics').then(({ data }) => setStats(data.analytics)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const cards = [
        { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Total Exams', value: stats?.totalExams ?? 0, icon: BookOpen, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Total Attempts', value: stats?.totalAttempts ?? 0, icon: Target, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
        { label: 'Avg Accuracy', value: `${stats?.avgAccuracy?.toFixed(1) ?? 0}%`, icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>College Analytics</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Detailed performance insights for your institution</p>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                {/* Performance by Subject */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={18} color="#6366f1" /> Performance by Subject
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {stats?.subjectStats?.map((s, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 600 }}>{s._id}</span>
                                    <span style={{ color: '#64748b' }}>{s.avgScore?.toFixed(1)}% Accuracy</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--border-light)', borderRadius: 9999 }}>
                                    <div style={{ height: '100%', borderRadius: 9999, background: '#3b82f6', width: `${s.avgScore}%`, transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Engagement Metrics */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={18} color="#10b981" /> Student Engagement
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(59,130,246,0.05)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase' }}>Participation</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.participationRate?.toFixed(1)}%</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.05)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Passing Rate</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats?.passingRate?.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={14} color="#f59e0b" /> Insight:
                        </div>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                            {stats?.avgAccuracy < 50 ? 'Overall accuracy is below target. Consider reviewing content difficulty.' : 'Students are showing consistent performance across most subjects.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
