import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, RotateCcw, UserCheck, Clock, AlertTriangle, CheckCircle, XCircle, Minus, Users } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmModal';

const STATUS_STYLES = {
    'in-progress': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '● In Progress' },
    'submitted': { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: '✓ Submitted' },
    'auto-submitted': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '⏰ Auto-Submitted' },
    'blocked': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '✗ Blocked' },
};

/** Reusable manage panel used by both College Admin and Teacher portals */
export default function ExamManage({ apiBase = '/college-admin' }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [progress, setProgress] = useState([]);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const pollingRef = useRef(null);

    const fetchProgress = async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const { data } = await api.get(`${apiBase}/exam-sessions/${id}/student-progress`);
            setProgress(data.progress || []);
            setSession(data.sessionCode ?? null);
        } catch { if (!quiet) toast.error('Failed to load student progress'); }
        finally { setLoading(false); }
    };

    // Poll every 15 seconds for live updates
    useEffect(() => {
        fetchProgress();
        pollingRef.current = setInterval(() => fetchProgress(true), 15000);
        return () => clearInterval(pollingRef.current);
    }, [id]);

    const allowRejoin = async (studentId, studentName) => {
        if (!await confirm(`Allow ${studentName} to rejoin? Their rejoin & warning counts will be reset.`, {
            title: 'Allow Rejoin',
            variant: 'warning',
            confirmLabel: 'Allow Rejoin',
        })) return;
        try {
            await api.patch(`${apiBase}/exam-sessions/${id}/students/${studentId}/allow-rejoin`);
            toast.success(`${studentName} can now rejoin the exam.`);
            fetchProgress(true);
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to allow rejoin'); }
    };

    const resetExam = async (studentId, studentName) => {
        if (!await confirm(
            `This will DELETE all of ${studentName}'s answers and exam attempt. They will start the exam completely from scratch. This cannot be undone.`,
            { title: 'Reset Student Exam?', variant: 'danger', confirmLabel: 'Yes, Reset It' }
        )) return;
        try {
            const { data } = await api.patch(`${apiBase}/exam-sessions/${id}/students/${studentId}/reset`);
            toast.success(data.message);
            fetchProgress(true);
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to reset exam'); }
    };

    const filtered = progress.filter(p => {
        const name = p.studentId?.name?.toLowerCase() || '';
        const email = p.studentId?.email?.toLowerCase() || '';
        const sid = p.studentId?.studentId?.toLowerCase() || '';
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q) || sid.includes(q);
    });

    // Stats
    const stats = {
        total: progress.length,
        inProgress: progress.filter(p => p.status === 'in-progress').length,
        submitted: progress.filter(p => p.status === 'submitted' || p.status === 'auto-submitted').length,
        blocked: progress.filter(p => p.status === 'blocked').length,
    };

    const timeSince = (date) => {
        if (!date) return 'N/A';
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Live Exam Management</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                        Monitor students in real time and resolve issues during the exam.{session && <> Session Code: <strong style={{ color: '#8b5cf6', fontFamily: 'monospace' }}>{session}</strong></>}
                    </p>
                </div>
                <button onClick={() => fetchProgress()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Tracked', value: stats.total, icon: <Users size={18} />, color: '#64748b' },
                    { label: 'In Progress', value: stats.inProgress, icon: <Clock size={18} />, color: '#10b981' },
                    { label: 'Submitted', value: stats.submitted, icon: <CheckCircle size={18} />, color: '#6366f1' },
                    { label: 'Blocked', value: stats.blocked, icon: <AlertTriangle size={18} />, color: '#ef4444' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: `4px solid ${s.color}` }}>
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by student name, email or ID..."
                    className="input"
                    style={{ paddingLeft: '1rem' }}
                />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th>Warnings</th>
                                <th>Rejoins</th>
                                <th>Last Active</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    {progress.length === 0 ? 'No students have started the exam yet.' : 'No students match your search.'}
                                </td></tr>
                            ) : filtered.map(p => {
                                const st = STATUS_STYLES[p.status] || STATUS_STYLES['in-progress'];
                                const answeredCount = (p.answers || []).filter(a => a.selectedOption !== null).length;
                                const totalQ = p.answers?.length || 0;
                                const needsRejoin = p.status === 'blocked' || p.rejoinCount > 0;
                                const isFinished = p.status === 'submitted' || p.status === 'auto-submitted';

                                return (
                                    <tr key={p._id} style={{ background: p.status === 'blocked' ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.studentId?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.studentId?.email} • {p.studentId?.department} Sem {p.studentId?.semester}</div>
                                        </td>
                                        <td>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.72rem', background: st.bg, color: st.color }}>
                                                {st.label}
                                            </span>
                                        </td>
                                        <td>
                                            {totalQ > 0 ? (
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{answeredCount}/{totalQ}</div>
                                                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: 80, marginTop: 2 }}>
                                                        <div style={{ height: '100%', borderRadius: 2, background: '#10b981', width: `${(answeredCount / totalQ) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>}
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: p.warningCount > 1 ? '#ef4444' : '#64748b' }}>
                                                {p.warningCount ?? 0}/3
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.rejoinCount ?? 0}</span>
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            {timeSince(p.lastActiveAt)}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                {/* Allow Rejoin */}
                                                {!isFinished && (
                                                    <button
                                                        onClick={() => allowRejoin(p.studentId?._id, p.studentId?.name)}
                                                        className="btn-secondary"
                                                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: needsRejoin ? '#fef3c7' : undefined, color: needsRejoin ? '#92400e' : undefined, borderColor: needsRejoin ? '#fde68a' : undefined }}
                                                        title="Reset rejoin & warning counts to let student re-enter"
                                                    >
                                                        <UserCheck size={13} /> Rejoin
                                                    </button>
                                                )}
                                                {/* Reset Exam */}
                                                <button
                                                    onClick={() => resetExam(p.studentId?._id, p.studentId?.name)}
                                                    className="btn-secondary"
                                                    style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.06)', color: '#ef4444', borderColor: '#fee2e2' }}
                                                    title="Completely reset this student's exam (deletes progress and attempts)"
                                                >
                                                    <RotateCcw size={13} /> Reset
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
                Auto-refreshes every 15 seconds. Last updated: {new Date().toLocaleTimeString('en-IN')}
            </p>
        </div>
    );
}
