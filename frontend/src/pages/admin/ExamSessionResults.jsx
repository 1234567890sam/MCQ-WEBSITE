import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Trophy, Clock, CheckCircle, XCircle, MinusCircle, Eye, EyeOff } from 'lucide-react';

export default function ExamSessionResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showResultsState, setShowResultsState] = useState(false);

    const fetchResults = async () => {
        try {
            const res = await api.get(`/admin/exam-sessions/${id}/results`);
            setData(res.data.results || []);
            setSession(res.data.session);
            // Also fetch the session for showResults toggle
            const sessionRes = await api.get(`/admin/exam-sessions/${id}`);
            setShowResultsState(sessionRes.data.session?.showResults);
        } catch { toast.error('Failed to load results'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchResults(); }, [id]);

    const toggleResults = async () => {
        try {
            const { data: d } = await api.patch(`/admin/exam-sessions/${id}/toggle-results`);
            setShowResultsState(d.showResults);
            toast.success(d.message);
        } catch { toast.error('Failed to toggle'); }
    };

    const exportExcel = () => {
        const token = localStorage.getItem('accessToken');
        const url = `${api.defaults.baseURL}/admin/exam-sessions/${id}/export?token=${token}`;
        window.open(url, '_blank');
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

    const total = data?.length || 0;
    const avgScore = total > 0 ? (data.reduce((s, r) => s + r.accuracy, 0) / total).toFixed(1) : 0;
    const highest = total > 0 ? data[0] : null;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/admin/exam-sessions')} className="btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{session?.title || 'Exam Results'}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                        Code: <code style={{ color: '#6366f1', fontWeight: 700 }}>{session?.code}</code> · Subject: {session?.subject}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={toggleResults}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: `1px solid ${showResultsState ? '#06b6d4' : '#e2e8f0'}`, background: showResultsState ? 'rgba(6,182,212,0.08)' : 'transparent', color: showResultsState ? '#06b6d4' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                        {showResultsState ? <Eye size={16} /> : <EyeOff size={16} />}
                        {showResultsState ? 'Results Visible to Students' : 'Results Hidden'}
                    </button>
                    <button onClick={exportExcel} className="btn-primary" style={{ background: '#10b981' }}>
                        <Download size={16} /> Export Excel
                    </button>
                </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Submissions', value: total, icon: CheckCircle, color: '#6366f1' },
                    { label: 'Average Score', value: `${avgScore}%`, icon: Trophy, color: '#f59e0b' },
                    { label: 'Top Score', value: highest ? `${highest.accuracy}%` : '—', icon: Trophy, color: '#10b981' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={20} color={color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.3rem', color }}>{value}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Results table */}
            {total === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    No submissions yet for this exam.
                </div>
            ) : (
                <div className="card">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th><th>Student</th><th>Score</th><th>Accuracy</th>
                                    <th><CheckCircle size={13} style={{ verticalAlign: 'middle' }} /> Correct</th>
                                    <th><XCircle size={13} style={{ verticalAlign: 'middle' }} /> Wrong</th>
                                    <th><MinusCircle size={13} style={{ verticalAlign: 'middle' }} /> Skipped</th>
                                    <th><Clock size={13} style={{ verticalAlign: 'middle' }} /> Time</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((r) => (
                                    <tr key={r.email}>
                                        <td>
                                            <span style={{ fontWeight: 800, color: r.rank === 1 ? '#f59e0b' : r.rank === 2 ? '#94a3b8' : r.rank === 3 ? '#cd7c2f' : '#64748b', fontSize: r.rank <= 3 ? '1rem' : '0.875rem' }}>
                                                {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.email}</div>
                                        </td>
                                        <td style={{ fontWeight: 700 }}>{r.score} / {r.maxScore}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: r.accuracy >= 70 ? '#10b981' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444' }}>
                                                {r.accuracy}%
                                            </span>
                                        </td>
                                        <td style={{ color: '#10b981', fontWeight: 600 }}>{r.correctCount}</td>
                                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{r.wrongCount}</td>
                                        <td style={{ color: '#94a3b8', fontWeight: 600 }}>{r.skippedCount}</td>
                                        <td style={{ color: '#64748b' }}>{Math.floor(r.timeTaken / 60)}m {r.timeTaken % 60}s</td>
                                        <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(r.submittedAt).toLocaleString('en-IN')}</td>
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
