import { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { BarChart3, TrendingUp, Users, BookOpen, Layers } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/dashboard').then(({ data }) => setStats(data.stats)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const mergedSubjects = useMemo(() => {
        if (!stats) return [];
        const allSubs = new Set();
        stats.subjectDistribution?.forEach(s => allSubs.add(s._id));
        stats.attemptSubjectStats?.forEach(s => allSubs.add(s._id));
        stats.subjectPerformance?.forEach(s => allSubs.add(s._id));
        
        return Array.from(allSubs).map(sub => {
            const dist = stats.subjectDistribution?.find(s => s._id === sub);
            const att = stats.attemptSubjectStats?.find(s => s._id === sub);
            const perf = stats.subjectPerformance?.find(s => s._id === sub);
            
            return {
                subject: sub === null ? 'Mixed' : sub,
                totalQuestions: dist?.count || 0,
                totalAttempts: att?.attempts || 0,
                avgScore: att?.avgScore?.toFixed(1) || 0,
                correctRate: perf?.correctRate?.toFixed(1) || 0
            };
        }).sort((a,b) => b.totalAttempts - a.totalAttempts);
    }, [stats]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;

    const attemptsBarData = {
        labels: stats?.subjectAttemptsAll?.map(s => s._id || 'Unknown') || [],
        datasets: [{
            label: 'Attempts',
            data: stats?.subjectAttemptsAll?.map(s => s.count) || [],
            backgroundColor: '#6366f1',
            borderRadius: 4,
        }]
    };

    const subjectPieData = {
        labels: stats?.subjectDistribution?.map(s => s._id || 'Unknown') || [],
        datasets: [{
            data: stats?.subjectDistribution?.map(s => s.count) || [],
            backgroundColor: COLORS,
            borderWidth: 0,
        }]
    };

    const scoreTrendData = {
        labels: stats?.attemptsTrend?.map(t => new Date(t._id).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) || [],
        datasets: [{
            label: 'Avg Score (%)',
            data: stats?.attemptsTrend?.map(t => t.avgAccuracy.toFixed(1)) || [],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.1)',
            fill: true,
            tension: 0.4
        }]
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Analytics</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Platform-wide statistics and performance insights</p>
            </div>

            {/* Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Students', value: stats?.totalUsers, icon: Users, color: '#6366f1' },
                    { label: 'Total Subjects', value: stats?.totalSubjects, icon: Layers, color: '#8b5cf6' },
                    { label: 'Total Questions', value: stats?.totalQuestions, icon: BookOpen, color: '#10b981' },
                    { label: 'Total Attempts', value: stats?.totalAttempts, icon: BarChart3, color: '#06b6d4' },
                    { label: 'Avg Score', value: `${stats?.avgAccuracy}%`, icon: TrendingUp, color: '#f59e0b' },
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Score Trend Line Chart */}
                <div className="card">
                    <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={18} color="#06b6d4" /> Score Trend (Past 30 Days)
                    </div>
                    <div style={{ height: 260 }}>
                        <Line data={scoreTrendData} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>

                {/* Subject Attempts Bar Chart */}
                {attemptsBarData.labels.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={18} color="#6366f1" /> Attempts by Subject
                        </div>
                        <div style={{ height: 260 }}>
                            <Bar data={attemptsBarData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                        </div>
                    </div>
                )}

                {/* Question Distribution Pie Chart */}
                {subjectPieData.labels.length > 0 && (
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BookOpen size={18} color="#8b5cf6" /> Subject Question Distribution
                        </div>
                        <div style={{ height: 260, display: 'flex', justifyContent: 'center' }}>
                            <Pie data={subjectPieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Subject-Wise Analytics Table */}
            {mergedSubjects.length > 0 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Layers size={18} color="#f59e0b" /> Subject-wise Analytics
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Subject</th><th>Total Questions</th><th>Total Attempts</th><th>Average Score</th><th>Correct Answer Rate</th></tr>
                            </thead>
                            <tbody>
                                {mergedSubjects.map((s) => (
                                    <tr key={s.subject}>
                                        <td><span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{s.subject}</span></td>
                                        <td style={{ fontWeight: 700 }}>{s.totalQuestions}</td>
                                        <td style={{ fontWeight: 600 }}>{s.totalAttempts}</td>
                                        <td style={{ fontWeight: 700, color: s.avgScore >= 70 ? '#10b981' : s.avgScore >= 40 ? '#f59e0b' : '#ef4444' }}>{s.avgScore}%</td>
                                        <td style={{ fontWeight: 700, color: s.correctRate >= 70 ? '#10b981' : s.correctRate >= 40 ? '#f59e0b' : '#ef4444' }}>{s.correctRate}%</td>
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
