/**
 * Teacher Exam Management page — wraps the shared ExamManage panel
 * but uses the teacher's API endpoint for student progress.
 * 
 * Teacher API: GET /api/teacher/exams/:id (returns exam + progress array)
 * This page is a bespoke implementation tailored for the teacher's data shape.
 */
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, UserCheck, RotateCcw, Clock, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmModal';

const STATUS_STYLES = {
    'in-progress': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '● In Progress' },
    'submitted': { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: '✓ Submitted' },
    'auto-submitted': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '⏰ Auto-Submitted' },
    'blocked': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '✗ Blocked' },
};

export default function TeacherExamManage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [exam, setExam] = useState(null);
    const [progress, setProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const pollingRef = useRef(null);

    const fetchData = async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const { data } = await api.get(`/teacher/exams/${id}`);
            setExam(data.exam);
            setProgress(data.progress || []);
        } catch { if (!quiet) toast.error('Failed to load exam data'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(() => fetchData(true), 15000);
        return () => clearInterval(pollingRef.current);
    }, [id]);

    const allowRejoin = async (studentId, studentName) => {
        if (!await confirm(`Allow ${studentName} to rejoin? Rejoin & warning counts will be reset.`, {
            title: 'Allow Rejoin', variant: 'warning', confirmLabel: 'Allow'
        })) return;
        try {
            await api.patch(`/teacher/exams/${id}/students/${studentId}/allow-rejoin`);
            toast.success(`${studentName} can rejoin now.`);
            fetchData(true);
        } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    };

    const resetExam = async (studentId, studentName) => {
        if (!await confirm(
            `This will delete all of ${studentName}'s answers and attempt. They will start fresh. Cannot be undone.`,
            { title: 'Reset Exam?', variant: 'danger', confirmLabel: 'Yes, Reset' }
        )) return;
        try {
            const { data } = await api.patch(`/teacher/exams/${id}/students/${studentId}/reset`);
            toast.success(data.message);
            fetchData(true);
        } catch (e) { toast.error(e.response?.data?.message || 'Reset failed'); }
    };

    const timeSince = (date) => {
        if (!date) return 'N/A';
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    };

    // Build a map of student progress
    const progressMap = {};
    progress.forEach(p => { progressMap[String(p.studentId)] = p; });

    const allowedStudents = exam?.allowedStudents || [];
    // Merge allowed students with progress data
    const rows = allowedStudents.map(s => {
        const sid = String(s._id || s);
        const p = progressMap[sid];
        return { student: s, progress: p || null };
    }).filter(r => {
        const q = search.toLowerCase();
        const s = r.student;
        return (s.name || '').toLowerCase().includes(q) ||
            (s.email || '').toLowerCase().includes(q) ||
            (s.studentId || '').toLowerCase().includes(q);
    });

    const stats = {
        total: allowedStudents.length,
        inProgress: progress.filter(p => p.status === 'in-progress').length,
        submitted: progress.filter(p => p.status === 'submitted' || p.status === 'auto-submitted').length,
        blocked: progress.filter(p => p.status === 'blocked').length,
        notStarted: allowedStudents.length - progress.length,
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Live Exam Management</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                        {exam?.title} — {exam?.subject}
                        {exam?.sessionCode && <> | Code: <strong style={{ color: '#8b5cf6', fontFamily: 'monospace' }}>{exam.sessionCode}</strong></>}
                    </p>
                </div>
                <button onClick={() => fetchData()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Total Students', value: stats.total, color: '#64748b', icon: <Users size={16} /> },
                    { label: 'Not Started', value: stats.notStarted, color: '#94a3b8', icon: <Clock size={16} /> },
                    { label: 'In Progress', value: stats.inProgress, color: '#10b981', icon: <Clock size={16} /> },
                    { label: 'Submitted', value: stats.submitted, color: '#6366f1', icon: <CheckCircle size={16} /> },
                    { label: 'Blocked', value: stats.blocked, color: '#ef4444', icon: <AlertTriangle size={16} /> },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: `4px solid ${s.color}` }}>
                        <div style={{ color: s.color }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 1 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="input" style={{ marginBottom: '1rem' }} />

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Status</th>
                                <th>Answered</th>
                                <th>Warnings</th>
                                <th>Rejoins</th>
                                <th>Last Active</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found.</td></tr>
                            ) : rows.map(({ student: s, progress: p }) => {
                                const st = p ? (STATUS_STYLES[p.status] || STATUS_STYLES['in-progress']) : null;
                                const answeredCount = p ? (p.answers || []).filter(a => a.selectedOption !== null).length : 0;
                                const totalQ = p?.answers?.length || 0;
                                const needsRejoin = p && (p.status === 'blocked' || p.rejoinCount > 0);
                                const isFinished = p && (p.status === 'submitted' || p.status === 'auto-submitted');

                                return (
                                    <tr key={s._id} style={{ background: p?.status === 'blocked' ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.email} • ID: {s.studentId || 'N/A'}</div>
                                        </td>
                                        <td>
                                            {p ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.72rem', background: st.bg, color: st.color }}>
                                                    {st.label}
                                                </span>
                                            ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Not Started</span>}
                                        </td>
                                        <td>
                                            {p && totalQ > 0 ? (
                                                <div>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{answeredCount}/{totalQ}</div>
                                                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, width: 70, marginTop: 2 }}>
                                                        <div style={{ height: '100%', borderRadius: 2, background: '#10b981', width: `${(answeredCount / totalQ) * 100}%` }} />
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', fontWeight: 700, color: (p?.warningCount || 0) > 1 ? '#ef4444' : '#64748b' }}>
                                            {p?.warningCount ?? '—'}/3
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{p?.rejoinCount ?? '—'}</td>
                                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{timeSince(p?.lastActiveAt)}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                {p && !isFinished && (
                                                    <button onClick={() => allowRejoin(s._id, s.name)} className="btn-secondary"
                                                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: needsRejoin ? '#fef3c7' : undefined, color: needsRejoin ? '#92400e' : undefined, borderColor: needsRejoin ? '#fde68a' : undefined }}>
                                                        <UserCheck size={13} /> Rejoin
                                                    </button>
                                                )}
                                                {p && (
                                                    <button onClick={() => resetExam(s._id, s.name)} className="btn-secondary"
                                                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(239,68,68,0.06)', color: '#ef4444', borderColor: '#fee2e2' }}>
                                                        <RotateCcw size={13} /> Reset
                                                    </button>
                                                )}
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
                Auto-refreshes every 15 seconds.
            </p>
        </div>
    );
}
