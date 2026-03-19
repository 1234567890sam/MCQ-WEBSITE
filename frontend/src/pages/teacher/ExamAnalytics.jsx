import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Target, Clock, Users, AlertCircle, CheckCircle2, Award, PieChart as PieChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import api from '../../api/axios';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function ExamAnalytics() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get(`/teacher/exams/${id}`), api.get(`/teacher/exams/${id}/analytics`)])
            .then(([examRes, analyticsRes]) => {
                setExam(examRes.data.exam);
                setAnalytics(analyticsRes.data.analytics);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;
    if (!analytics) return <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>No analytics data available yet.</div>;

    const cards = [
        { label: 'Participated', value: analytics.total, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Pass Rate', value: `${analytics.passRate}%`, icon: Target, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Avg Score', value: `${analytics.avgScore}%`, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Avg Time', value: `${analytics.avgTimeTaken}m`, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ];

    const pieData = [
        { name: 'Passed', value: analytics.passed },
        { name: 'Failed', value: analytics.failed },
    ];

    // Get worst performing questions (< 50% success)
    const troublingQuestions = (analytics.questionStats || [])
        .filter(q => q.successRate < 50)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Detailed Analytics</h1>
                    {exam && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Analyzing performance for: {exam.title}</p>}
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                {cards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card shadow-sm" style={{ background: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
                            </div>
                            <div style={{ width: 36, height: 36, borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={18} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Result Summary Pie Chart */}
                <div className="card shadow-sm">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <PieChartIcon size={18} color="#6366f1" />
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Pass vs Fail Overview</h3>
                    </div>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CO Performance Bar Chart */}
                <div className="card shadow-sm">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <BarChartIcon size={18} color="#8b5cf6" />
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>CO-wise Average Accuracy (%)</h3>
                    </div>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.coStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} fontSize={11} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {/* Score Distribution */}
                <div className="card shadow-sm">
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>Score Range Distribution</h3>
                    <div style={{ height: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="range" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis fontSize={11} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Troubling Questions */}
                <div className="card shadow-sm">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <AlertCircle size={18} color="#ef4444" />
                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Questions Needing Attention</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {troublingQuestions.length > 0 ? troublingQuestions.map((q, i) => (
                            <div key={i} style={{ padding: '0.875rem', borderRadius: '0.875rem', background: 'rgba(239,68,68,0.02)', border: '1px solid #fee2e2' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Q.{q.index}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>{q.successRate}% Success</span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                                    {q.question.length > 120 ? q.question.substring(0, 120) + '...' : q.question}
                                </p>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#10b981' }}>
                                <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.8 }} />
                                <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Excellent Performance!</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>All questions have over 50% success rate.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Students Highlighting */}
            <div className="card shadow-sm" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <Award size={20} color="#f59e0b" />
                    <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Top Performers</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                    {analytics.topStudents?.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '1rem', background: i === 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))' : 'white', border: `1px solid ${i === 0 ? '#fde68a' : 'var(--border-light)'}`, boxShadow: i === 0 ? '0 4px 12px rgba(245,158,11,0.08)' : 'none' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#e2e8f0', color: i < 3 ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 900, flexShrink: 0 }}>
                                {i + 1}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.95rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{s.percentage?.toFixed(1)}% Score</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
