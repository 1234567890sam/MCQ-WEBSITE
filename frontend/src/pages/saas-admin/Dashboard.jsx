import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Building2, Users, GraduationCap, BookOpen, BarChart2, Globe, TrendingUp } from 'lucide-react';

export default function SaasDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/saas/analytics')
            .then(r => setData(r.data.analytics))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const cards = [
        { label: 'Total Colleges', value: data?.totalColleges ?? 0, icon: Building2, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { label: 'Total Students', value: data?.totalStudents ?? 0, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Total Teachers', value: data?.totalTeachers ?? 0, icon: GraduationCap, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Total Exams', value: data?.totalExams ?? 0, icon: BookOpen, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Total Results', value: data?.totalResults ?? 0, icon: BarChart2, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>SaaS Admin Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Platform-wide overview and college statistics</p>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '1.5rem' }}>
                {/* College Breakdown */}
                {data?.collegeStats?.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Globe size={18} color="#f59e0b" /> College Performance Breakdown
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {data.collegeStats.map((c, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                        <span style={{ color: '#64748b' }}>{c.students} Students • {c.exams} Exams</span>
                                    </div>
                                    <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 9999, overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ height: '100%', background: '#3b82f6', width: `${(c.students / (data.totalStudents || 1)) * 100}%`, transition: 'width 0.5s ease' }} title="Students" />
                                        <div style={{ height: '100%', background: '#8b5cf6', width: `${(c.exams / (data.totalExams || 1)) * 100}%`, transition: 'width 0.5s ease' }} title="Exams" />
                                        <div style={{ height: '100%', background: '#10b981', width: `${(c.results / (data.totalResults || 1)) * 100}%`, transition: 'width 0.5s ease' }} title="Results" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> Students
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} /> Exams
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Results
                            </div>
                        </div>
                    </div>
                )}

                {/* Growth Trends */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#10b981" /> Platform Growth
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <div style={{ color: '#10b981', fontWeight: 600, fontSize: '0.75rem' }}>STUDENT ADOPTION</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data?.totalStudents ?? 0}</div>
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                            <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.75rem' }}>CONTENT CAPACITY</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{data?.totalExams ?? 0} Exams</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
