import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, Download, Trophy, Clock, CheckCircle, XCircle, MinusCircle, 
    Eye, EyeOff, BarChart2, List, Target, Users, AlertCircle, Award
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function ExamResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [session, setSession] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showResultsState, setShowResultsState] = useState(false);
    const [view, setView] = useState('list'); // 'list' | 'analytics'

    const fetchResults = async () => {
        try {
            const res = await api.get(`/college-admin/exam-sessions/${id}/results`);
            setData(res.data.results || []);
            setSession(res.data.session);
            setAnalytics(res.data.analytics);
            
            // Also fetch the session for showResults toggle
            const sessionRes = await api.get(`/college-admin/exam-sessions/${id}`);
            setShowResultsState(sessionRes.data.session?.showResults);
        } catch { toast.error('Failed to load results'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchResults(); }, [id]);

    const toggleResults = async () => {
        try {
            const { data: d } = await api.patch(`/college-admin/exam-sessions/${id}/toggle-results`);
            setShowResultsState(d.showResults);
            toast.success(d.message);
        } catch { toast.error('Failed to toggle'); }
    };

    const exportExcel = async (format = 'excel') => {
        try {
            const r = await api.get(`/college-admin/exam-sessions/${id}/export?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session?.title}_Results_${format === 'marksheet' ? 'Format' : 'Sheet'}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Excel exported successfully');
        } catch { toast.error('Export failed'); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

    const total = data?.length || 0;
    const troublingQuestions = (analytics?.questionStats || [])
        .filter(q => q.successRate < 50)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);

    const pieData = analytics ? [
        { name: 'Passed', value: analytics.passed },
        { name: 'Failed', value: analytics.failed },
    ] : [];

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/college-admin/exam-sessions')} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{session?.title || 'Exam Results'}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Code: <span style={{ color: '#10b981', fontWeight: 700 }}>{session?.code}</span> · Subject: {session?.subject}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={toggleResults} className="btn-secondary" style={{ borderColor: showResultsState ? '#06b6d4' : 'var(--border-light)', color: showResultsState ? '#06b6d4' : '#64748b', background: showResultsState ? 'rgba(6,182,212,0.05)' : 'white' }}>
                        {showResultsState ? <Eye size={16} /> : <EyeOff size={16} />} 
                        {showResultsState ? 'Results Live' : 'Results Hidden'}
                    </button>
                    <button onClick={() => exportExcel('marksheet')} className="btn-primary" style={{ background: '#0891b2' }}>
                        <Download size={16} /> Format
                    </button>
                    <button onClick={() => exportExcel('excel')} className="btn-primary" style={{ background: '#10b981' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--border-light)', padding: '0.35rem', borderRadius: '0.75rem', width: 'fit-content' }}>
                <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: view === 'list' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: view === 'list' ? '#6366f1' : '#64748b', boxShadow: view === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                    <List size={16} /> Students List
                </button>
                <button onClick={() => setView('analytics')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: view === 'analytics' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: view === 'analytics' ? '#6366f1' : '#64748b', boxShadow: view === 'analytics' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                    <BarChart2 size={16} /> Advanced Analytics
                </button>
            </div>

            {view === 'list' ? (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { label: 'Total Submissions', value: total, icon: Users, color: '#3b82f6' },
                            { label: 'Pass Rate', value: analytics ? `${analytics.passRate}%` : '0%', icon: Target, color: '#10b981' },
                            { label: 'Avg Accuracy', value: analytics ? `${analytics.avgScore}%` : '0%', icon: Trophy, color: '#f59e0b' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="card shadow-sm" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Icon size={20} color={color} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color }}>{value}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card shadow-sm">
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th><th>Student</th><th>Score</th><th>Accuracy</th><th>Time</th><th>Submitted</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((r) => (
                                        <tr key={r.rank}>
                                            <td>
                                                <span style={{ fontWeight: 800, color: r.rank <= 3 ? '#f59e0b' : '#64748b' }}>
                                                    {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700 }}>{r.studentName}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {r.studentId} · {r.email}</div>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{r.score} / {r.maxScore}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 800, color: r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444' }}>{r.accuracy}%</span>
                                                    <div style={{ width: 40, height: 4, background: '#f1f5f9', borderRadius: 2 }}>
                                                        <div style={{ height: '100%', borderRadius: 2, background: r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444', width: `${r.accuracy}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.85rem' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</td>
                                            <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(r.submittedAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="animate-up">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        {/* Result Summary Pie Chart */}
                        <div className="card shadow-sm">
                            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>Pass vs Fail Overview</h3>
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
                            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem' }}>CO-wise Average Accuracy (%)</h3>
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics?.coStats}>
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
                        {/* Troubling Questions */}
                        <div className="card shadow-sm">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <AlertCircle size={18} color="#ef4444" />
                                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Questions Needing Attention</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {troublingQuestions.length > 0 ? troublingQuestions.map((q, i) => (
                                    <div key={i} style={{ padding: '0.875rem', borderRadius: '0.875rem', background: 'rgba(239,68,68,0.01)', border: '1px solid #fee2e2' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>Q.{q.index}</span>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444' }}>{q.successRate}% Success</span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{q.question.substring(0, 120)}...</p>
                                    </div>
                                )) : <p style={{ textAlign: 'center', color: '#10b981', padding: '2rem' }}>All questions performed well!</p>}
                            </div>
                        </div>

                        {/* Top Performers Grid */}
                        <div className="card shadow-sm">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <Award size={18} color="#f59e0b" />
                                <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Top Performers</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                {data.slice(0, 6).map((r, i) => (
                                    <div key={i} style={{ padding: '0.75rem', borderRadius: '0.75rem', background: i === 0 ? 'rgba(245,158,11,0.05)' : '#f8fafc', border: `1px solid ${i === 0 ? '#fde68a' : '#e2e8f0'}` }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.studentName}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Rank #{r.rank} · {r.accuracy}%</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
