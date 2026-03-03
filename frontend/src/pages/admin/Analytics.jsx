import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BarChart3, TrendingUp, Users, BookOpen } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/dashboard').then(({ data }) => setStats(data.stats)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

    const subjectData = stats?.subjectStats?.map((s) => ({ name: s._id || 'Unknown', attempts: s.count })) || [];
    const difficultyData = [
        { name: 'Easy', value: 40 },
        { name: 'Medium', value: 40 },
        { name: 'Hard', value: 20 },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Analytics</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Platform-wide statistics and performance insights</p>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Students', value: stats?.totalUsers, icon: Users, color: '#6366f1' },
                    { label: 'Questions', value: stats?.totalQuestions, icon: BookOpen, color: '#10b981' },
                    { label: 'Avg Accuracy', value: `${stats?.avgAccuracy}%`, icon: TrendingUp, color: '#f59e0b' },
                    { label: 'Total Attempts', value: stats?.totalAttempts, icon: BarChart3, color: '#06b6d4' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={22} color={color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.4rem', lineHeight: 1, color }}>{value ?? '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Subject Attempts Bar Chart */}
                {subjectData.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={18} color="#6366f1" /> Attempts by Subject
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={subjectData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                <XAxis type="number" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                                <Tooltip />
                                <Bar dataKey="attempts" radius={[0, 4, 4, 0]}>
                                    {subjectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Difficulty Distribution Pie */}
                <div className="card">
                    <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#8b5cf6" /> Difficulty Distribution
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                                {difficultyData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i]} />)}
                            </Pie>
                            <Legend />
                            <Tooltip formatter={(v) => `${v}%`} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hardest Questions Table */}
            {stats?.hardestQuestions?.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🔥 Most Difficult Questions</div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Question</th><th>Subject</th><th>Attempts</th><th>Wrong Rate</th></tr>
                            </thead>
                            <tbody>
                                {stats.hardestQuestions.map((q) => (
                                    <tr key={q._id}>
                                        <td style={{ fontSize: '0.85rem', maxWidth: 400 }}>{q.question?.substring(0, 100)}{q.question?.length > 100 ? '…' : ''}</td>
                                        <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span></td>
                                        <td style={{ fontWeight: 700 }}>{q.timesAttempted}</td>
                                        <td style={{ color: q.wrongRate > 70 ? '#ef4444' : q.wrongRate > 50 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>{q.wrongRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
