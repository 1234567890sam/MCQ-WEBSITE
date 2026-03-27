import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';
import { Search, Edit2, Trash2, Check, X, Filter, ChevronLeft, ChevronRight, BookOpen, Upload, AlertTriangle } from 'lucide-react';

export default function ManageQuestions() {
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [questions, setQuestions] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [subjectCounts, setSubjectCounts] = useState([]);
    const [filter, setFilter] = useState({ subject: '', search: '' });
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [editId, setEditId] = useState(null);
    const [editData, setEditData] = useState({});

    const fetchQuestions = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            if (filter.subject) params.subject = filter.subject;
            if (filter.search) params.search = filter.search;
            const { data } = await api.get('/teacher/questions', { params });
            setQuestions(data.questions);
            setPagination({ page: data.pagination.page, total: data.pagination.total, pages: data.pagination.pages });
        } catch { }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        api.get('/teacher/subjects').then(({ data }) => {
            setSubjects(data.subjects);
            if (data.subjectCounts) setSubjectCounts(data.subjectCounts);
        }).catch(() => { });
    }, []);

    useEffect(() => { fetchQuestions(1); }, [filter]);

    const startEdit = (q) => {
        setEditId(q._id);
        setEditData({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, subject: q.subject, marks: q.marks, cos: q.cos });
    };

    const saveEdit = async () => {
        try {
            await api.put(`/teacher/questions/${editId}`, editData);
            toast.success('Question updated');
            setEditId(null);
            fetchQuestions(pagination.page);
        } catch { toast.error('Update failed'); }
    };

    const deleteQ = async (id) => {
        if (!await confirm('This question will be permanently deleted.', { title: 'Delete Question?', variant: 'danger', confirmLabel: 'Delete' })) return;
        try {
            await api.delete(`/teacher/questions/${id}`);
            toast.success('Deleted');
            fetchQuestions(pagination.page);
            api.get('/teacher/subjects').then(({ data }) => { setSubjects(data.subjects); if (data.subjectCounts) setSubjectCounts(data.subjectCounts); });
        } catch { toast.error('Delete failed'); }
    };

    const deleteQsBySubject = async () => {
        if (!filter.subject) return;
        const count = subjectCounts.find(c => c._id === filter.subject)?.count || 0;
        if (!await confirm(`All ${count} questions in "${filter.subject}" will be permanently deleted. This action cannot be undone.`, { title: `Delete All in "${filter.subject}"?`, variant: 'danger', confirmLabel: 'Delete All' })) return;
        try {
            const { data } = await api.delete('/teacher/questions/by-subject', { params: { subject: filter.subject } });
            toast.success(data.message || 'Subject questions deleted');
            setFilter({ subject: '', search: '' });
            api.get('/teacher/subjects').then(({ data }) => { setSubjects(data.subjects); if (data.subjectCounts) setSubjectCounts(data.subjectCounts); });
        } catch { toast.error('Delete failed'); }
    };

    const OPTS = ['A', 'B', 'C', 'D'];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manage Questions</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{pagination.total} total questions in your college bank</p>
                </div>
                <button 
                    onClick={() => navigate('/teacher/questions/upload')} 
                    className="btn-primary" 
                    style={{ padding: '0.75rem 1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Upload size={18} /> Upload Questions
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input className="input" placeholder="Search questions..." value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <BookOpen size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', zIndex: 1 }} />
                        <select 
                            className="input" 
                            value={filter.subject} 
                            onChange={(e) => setFilter({ ...filter, subject: e.target.value })} 
                            style={{ paddingLeft: '2.5rem' }}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(s => (
                                <option key={s} value={s}>{s} ({subjectCounts.find(c => c._id === s)?.count || 0})</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn-secondary" onClick={() => setFilter({ subject: '', search: '' })} style={{ justifyContent: 'center' }}>
                        <Filter size={15} /> Clear
                    </button>
                    {filter.subject && (
                        <button
                            onClick={deleteQsBySubject}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                            title={`Delete all questions in "${filter.subject}"`}
                        >
                            <AlertTriangle size={15} /> Delete All in "{filter.subject}"
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
            ) : (
                <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Question</th><th>Subject</th><th>Marks</th><th>COs</th><th>Answer</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {questions.map((q, i) => (
                                <tr key={q._id}>
                                    <td style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>
                                        {(pagination.page - 1) * 15 + i + 1}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <textarea
                                                className="input"
                                                value={editData.question}
                                                onChange={(e) => setEditData({ ...editData, question: e.target.value })}
                                                style={{ padding: '0.4rem', fontSize: '0.8rem', minHeight: 60, resize: 'vertical' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.875rem' }} title={q.question}>
                                                {q.question.length > 80 ? q.question.substring(0, 80) + '…' : q.question}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <input className="input" value={editData.subject} onChange={(e) => setEditData({ ...editData, subject: e.target.value })} style={{ padding: '0.4rem', fontSize: '0.8rem', width: 100 }} />
                                        ) : (
                                            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{q.subject}</span>
                                        )}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <input 
                                                type="number" 
                                                className="input" 
                                                value={editData.marks} 
                                                onChange={(e) => setEditData({ ...editData, marks: e.target.value })} 
                                                style={{ padding: '0.4rem', fontSize: '0.8rem', width: 60 }} 
                                            />
                                        ) : (
                                            <span style={{ fontWeight: 700 }}>{q.marks}</span>
                                        )}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <input 
                                                className="input" 
                                                value={editData.cos || ''} 
                                                onChange={(e) => setEditData({ ...editData, cos: e.target.value })} 
                                                style={{ padding: '0.4rem', fontSize: '0.8rem', width: 80 }} 
                                                placeholder="e.g. CO1, CO2"
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{q.cos || '-'}</span>
                                        )}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <select className="input" value={editData.correctAnswer} onChange={(e) => setEditData({ ...editData, correctAnswer: e.target.value })} style={{ padding: '0.4rem', fontSize: '0.8rem', width: 60 }}>
                                                {OPTS.map((o) => <option key={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <span style={{ fontWeight: 800, color: '#10b981' }}>{q.correctAnswer}</span>
                                        )}
                                    </td>
                                    <td>
                                        {editId === q._id ? (
                                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                <button onClick={saveEdit} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><Check size={14} /></button>
                                                <button onClick={() => setEditId(null)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                <button onClick={() => startEdit(q)} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                                <button onClick={() => deleteQ(q._id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {questions.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        <div style={{ marginBottom: '1rem' }}>No questions found in this view.</div>
                                        <button 
                                            onClick={() => navigate('/teacher/questions/upload')} 
                                            className="btn-secondary" 
                                            style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <Upload size={16} /> Upload your first questions
                                        </button>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => fetchQuestions(pagination.page - 1)} disabled={pagination.page === 1} style={{ padding: '0.5rem', opacity: pagination.page === 1 ? 0.4 : 1 }}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Page {pagination.page} of {pagination.pages}</span>
                    <button className="btn-secondary" onClick={() => fetchQuestions(pagination.page + 1)} disabled={pagination.page === pagination.pages} style={{ padding: '0.5rem', opacity: pagination.page === pagination.pages ? 0.4 : 1 }}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
