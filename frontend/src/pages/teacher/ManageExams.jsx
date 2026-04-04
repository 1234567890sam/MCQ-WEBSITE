import { useEffect, useState } from 'react';
import { FileText, Trash2, Clock, PlusCircle, Users, BarChart2, BookOpen, Eye, EyeOff, CheckSquare, Square, ToggleLeft, ToggleRight, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function TeacherManageExams() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchExams = () => {
        api.get('/teacher/exams')
            .then(r => setExams(r.data.exams || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExams(); }, []);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this exam?')) return;
        try {
            await api.delete(`/teacher/exams/${id}`);
            toast.success('Exam deleted');
            fetchExams();
        } catch { toast.error('Delete failed'); }
    };

    const toggleField = async (id, field, currentValue, label) => {
        try {
            await api.put(`/teacher/exams/${id}`, { [field]: !currentValue });
            setExams(prev => prev.map(e => e._id === id ? { ...e, [field]: !currentValue } : e));
            toast.success(`${label} ${!currentValue ? 'enabled' : 'disabled'}`);
        } catch { toast.error('Update failed'); }
    };

    const toggleActive = (exam) => toggleField(exam._id, 'isActive', exam.isActive, 'Exam');
    const toggleResults = (exam) => toggleField(exam._id, 'showResults', exam.showResults, 'Results visibility');
    const toggleQA = (exam) => toggleField(exam._id, 'showQA', exam.showQA, 'QA review');

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Exams</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Create and manage examinations for your students</p>
                </div>
                <Link to="/teacher/exams/create" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6' }}>
                    <PlusCircle size={18} /> Create New Exam
                </Link>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {[
                    { color: '#10b981', label: 'Release Results — students can see score' },
                    { color: '#6366f1', label: 'Show QA — students see per-question breakdown' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#64748b' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '2px', background: color }} />
                        {label}
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Subject</th>
                                <th>Duration</th>
                                <th>Live</th>
                                <th>Results</th>
                                <th>Show QA</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : exams.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No exams yet. Create your first!</td></tr>
                            ) : exams.map(e => (
                                <tr key={e._id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.title}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{e.questions?.length || 0} Qs &bull; {new Date(e.date || e.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b5cf6' }}>{e.subject}</span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#64748b' }}>
                                            <Clock size={13} /> {e.duration} min
                                        </div>
                                    </td>

                                    {/* Live toggle */}
                                    <td>
                                        <button onClick={() => toggleActive(e)} title={e.isActive ? 'Deactivate exam' : 'Activate exam'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', color: e.isActive ? '#10b981' : '#94a3b8', fontWeight: 700, fontSize: '0.75rem' }}>
                                            {e.isActive ? <ToggleRight size={22} color="#10b981" /> : <ToggleLeft size={22} color="#94a3b8" />}
                                        </button>
                                    </td>

                                    {/* Release Results toggle */}
                                    <td>
                                        <button
                                            onClick={() => toggleResults(e)}
                                            title={e.showResults ? 'Hide results from students' : 'Release results to students'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', border: `1px solid ${e.showResults ? '#10b981' : '#e2e8f0'}`, background: e.showResults ? 'rgba(16,185,129,0.08)' : 'transparent', fontWeight: 700, fontSize: '0.72rem', color: e.showResults ? '#10b981' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {e.showResults ? <Eye size={13} /> : <EyeOff size={13} />}
                                            {e.showResults ? 'Released' : 'Release'}
                                        </button>
                                    </td>

                                    {/* Show QA toggle */}
                                    <td>
                                        <button
                                            onClick={() => toggleQA(e)}
                                            title={e.showQA ? 'Hide QA from students' : 'Show Q&A review to students'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem', borderRadius: '0.5rem', border: `1px solid ${e.showQA ? '#6366f1' : '#e2e8f0'}`, background: e.showQA ? 'rgba(99,102,241,0.08)' : 'transparent', fontWeight: 700, fontSize: '0.72rem', color: e.showQA ? '#6366f1' : '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {e.showQA ? <CheckSquare size={13} /> : <Square size={13} />}
                                            {e.showQA ? 'Visible' : 'Show'}
                                        </button>
                                    </td>

                                    {/* Action buttons */}
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            <Link to={`/teacher/exams/${e._id}/manage`} className="btn-secondary"
                                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#b45309', borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
                                                <Settings size={13} /> Manage
                                            </Link>
                                            <Link to={`/teacher/exams/${e._id}/students`} className="btn-secondary"
                                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Users size={13} /> Students
                                            </Link>
                                            <Link to={`/teacher/exams/${e._id}/results`} className="btn-secondary"
                                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', borderColor: '#10b981' }}>
                                                <FileText size={13} /> Results
                                            </Link>
                                            <Link to={`/teacher/exams/${e._id}/analytics`} className="btn-secondary"
                                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', borderColor: '#3b82f6' }}>
                                                <BarChart2 size={13} /> Analytics
                                            </Link>
                                            <button onClick={() => handleDelete(e._id)} className="btn-danger" style={{ padding: '0.35rem 0.55rem' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
