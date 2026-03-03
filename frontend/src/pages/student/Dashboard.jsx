import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
    Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart
} from 'recharts';
import {
    LayoutDashboard, Target, BookOpen, AlertTriangle, TrendingUp,
    Clock, CheckCircle2, XCircle, ChevronRight, Brain
} from 'lucide-react';

// Register Chart.js — using recharts instead (already bundled in react-chartjs-2)

export default function StudentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/student/dashboard')
            .then(({ data }) => setStats(data.stats))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Attempts', value: stats?.totalAttempts ?? 0, icon: LayoutDashboard, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
        { label: 'Avg Accuracy', value: `${stats?.avgAccuracy ?? 0}%`, icon: Target, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Strong Subject', value: stats?.strongSubject || 'N/A', icon: CheckCircle2, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
        { label: 'Weak Subject', value: stats?.weakSubject || 'N/A', icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ];

    const chartData = stats?.recentAttempts?.map((a, i) => ({
        name: `#${i + 1}`,
        accuracy: parseFloat(a.accuracy?.toFixed(1) || 0),
        score: Math.round(a.score || 0),
    })) || [];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                    <span className="gradient-text">{user?.name?.split(' ')[0]}! 👋</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Here's your learning progress at a glance</p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={22} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/practice" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <BookOpen size={18} /> <span style={{ fontWeight: 700 }}>Practice Mode</span>
                            </div>
                            <div style={{ opacity: 0.85, fontSize: '0.8rem' }}>Select subject & difficulty</div>
                        </div>
                        <ChevronRight size={20} />
                    </div>
                </Link>
                <Link to="/exam" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <Clock size={18} /> <span style={{ fontWeight: 700 }}>Exam Mode</span>
                            </div>
                            <div style={{ opacity: 0.85, fontSize: '0.8rem' }}>Timed exam simulation</div>
                        </div>
                        <ChevronRight size={20} />
                    </div>
                </Link>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {/* Accuracy Line Chart */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={18} color="#6366f1" /> Accuracy Trend
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                                <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Subject Performance Bar Chart */}
                    {stats?.subjectPerformance?.length > 0 && (
                        <div className="card">
                            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Brain size={18} color="#8b5cf6" /> Subject Accuracy
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={stats.subjectPerformance.slice(0, 6)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                    <XAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                                    <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Attempts */}
            {stats?.latestAttempts?.length > 0 && (
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Recent Attempts</div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Mode</th>
                                    <th>Subject</th>
                                    <th>Score</th>
                                    <th>Accuracy</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.latestAttempts.map((a) => (
                                    <tr key={a._id}>
                                        <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`badge ${a.mode === 'exam' ? 'badge-hard' : 'badge-easy'}`}>{a.mode}</span>
                                        </td>
                                        <td>{a.subject || 'Mixed'}</td>
                                        <td style={{ fontWeight: 700 }}>{a.score?.toFixed(1)} / {a.maxScore}</td>
                                        <td>
                                            <span style={{ color: a.accuracy >= 70 ? '#10b981' : a.accuracy >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                                                {a.accuracy?.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td>
                                            <Link to={`/result/${a._id}`} style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {stats?.totalAttempts === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Brain size={48} color="#6366f1" style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Start Your First Practice!</h3>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Take a practice quiz or exam to start tracking your progress.</p>
                    <Link to="/practice" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Start Practicing <ChevronRight size={16} />
                    </Link>
                </div>
            )}
        </div>
    );
}
