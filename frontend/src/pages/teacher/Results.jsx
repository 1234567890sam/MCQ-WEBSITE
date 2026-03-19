import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BarChart3, Users, Target, Download, FileText, Search, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TeacherResults() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetch = () => {
        api.get('/teacher/analytics')
            .then(r => setStats(r.data.stats))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const exportStats = async (format) => {
        try {
            const response = await api.get(`/teacher/export-results?format=${format}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Exam_Results.${format === 'excel' ? 'xlsx' : format}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(`Exported as ${format.toUpperCase()}`);
        } catch { toast.error('Export failed'); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}><div className="spinner" /></div>;

    const filteredAttempts = stats?.recentAttempts?.filter(a => 
        a.studentName?.toLowerCase().includes(search.toLowerCase()) || 
        a.examTitle?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Exam Performance & Results</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Track student progress and export detailed analytical reports</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => exportStats('excel')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}><Download size={14} /> Excel</button>
                    <button onClick={() => exportStats('pdf')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}><FileText size={14} /> PDF</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>TOTAL ATTEMPTS</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8b5cf6' }}>{stats?.totalAttempts ?? 0}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>AVG. CLASS SCORE</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{stats?.avgScore?.toFixed(1) ?? 0}%</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem' }}>PASSING RATE</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6' }}>{stats?.passingRate?.toFixed(1) ?? 0}%</div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recent Submissions</h3>
                    <div style={{ position: 'relative', width: '250px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by student or exam..." className="input" style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', padding: '0.4rem 2.2rem' }} />
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Exam</th>
                                <th>Score</th>
                                <th>Result</th>
                                <th style={{ textAlign: 'right' }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAttempts.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No record matches found</td></tr>
                            ) : filteredAttempts.map((a, i) => (
                                <tr key={i}>
                                    <td><span style={{ fontWeight: 700 }}>{a.studentName}</span></td>
                                    <td><span style={{ fontSize: '0.8rem' }}>{a.examTitle}</span></td>
                                    <td><span style={{ fontWeight: 600 }}>{a.score}%</span></td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: a.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: a.passed ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                            {a.passed ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>{new Date(a.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
