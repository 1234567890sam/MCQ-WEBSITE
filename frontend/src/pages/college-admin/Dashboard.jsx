import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, GraduationCap, FileText, CheckCircle, Target, TrendingUp, BarChart3 } from 'lucide-react';

export default function CollegeDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/college-admin/dashboard')
            .then(r => setData(r.data.stats))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const cards = [
        { label: 'Total Teachers', value: data?.totalTeachers ?? 0, icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Total Students', value: data?.totalStudents ?? 0, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Total Exams', value: data?.totalExams ?? 0, icon: FileText, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Active Students', value: data?.activeStudents ?? 0, icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Passing Users', value: data?.passingUsers ?? 0, icon: Target, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>College Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Overview of staff, students, and active exams</p>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
                {/* Recent Activity or Quick List */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#10b981" /> College Performance Trends
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overall Accuracy</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>{data?.avgAccuracy?.toFixed(1) ?? 0}%</span>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Participation Rate</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6' }}>{((data?.activeStudents / (data?.totalStudents || 1)) * 100).toFixed(1) ?? 0}%</span>
                        </div>
                    </div>
                </div>

                {/* Popular Exams */}
                {data?.popularExams?.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={18} color="#8b5cf6" /> Most Popular Exams
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {data.popularExams.map((e, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < data.popularExams.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{e.title}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{e.count} attempts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
