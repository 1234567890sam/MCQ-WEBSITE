import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Check, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ManageQuestions() {
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
            const { data } = await api.get('/admin/questions', { params });
            setQuestions(data.questions);
            setPagination({ page: data.pagination.page, total: data.pagination.total, pages: data.pagination.pages });
        } catch { }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        api.get('/admin/subjects').then(({ data }) => {
            setSubjects(data.subjects);
            if (data.subjectCounts) setSubjectCounts(data.subjectCounts);
        }).catch(() => { });
    }, []);

    useEffect(() => { fetchQuestions(1); }, [filter]);

    const startEdit = (q) => {
        setEditId(q._id);
        setEditData({ question: q.question, options: [...q.options], correctAnswer: q.correctAnswer, subject: q.subject, marks: q.marks });
    };

    const saveEdit = async () => {
        try {
            await api.put(`/admin/questions/${editId}`, editData);
            toast.success('Question updated');
            setEditId(null);
            fetchQuestions(pagination.page);
        } catch { toast.error('Update failed'); }
    };

    const deleteQ = async (id) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await api.delete(`/admin/questions/${id}`);
            toast.success('Deleted');
            fetchQuestions(pagination.page);
            api.get('/admin/subjects').then(({ data }) => { setSubjects(data.subjects); if (data.subjectCounts) setSubjectCounts(data.subjectCounts); });
        } catch { toast.error('Delete failed'); }
    };

    const deleteSubject = async (subject) => {
        const countObj = subjectCounts.find(s => s._id === subject);
        const count = countObj ? countObj.count : 'all';
        if (!window.confirm(`Are you sure you want to delete ${count} questions of subject "${subject}"? This action cannot be undone.`)) return;
        
        try {
            await api.delete(`/admin/questions/subject/${subject}`);
            toast.success(`Subject ${subject} deleted`);
            setFilter({ ...filter, subject: '' });
            api.get('/admin/subjects').then(({ data }) => { setSubjects(data.subjects); if (data.subjectCounts) setSubjectCounts(data.subjectCounts); });
            fetchQuestions(1);
        } catch { toast.error('Delete failed'); }
    };

    const OPTS = ['A', 'B', 'C', 'D'];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manage Questions</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{pagination.total} total questions</p>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                        <input className="input" placeholder="Search questions..." value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} style={{ paddingLeft: '2.5rem' }} />
                    </div>
                    <button className="btn-secondary" onClick={() => setFilter({ subject: '', search: '' })} style={{ justifyContent: 'center' }}>
                        <Filter size={15} /> Clear
                    </button>
                    {filter.subject && (
                        <button onClick={() => deleteSubject(filter.subject)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                            <Trash2 size={15} /> Delete Subject
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
                            <tr><th>#</th><th>Question</th><th>Subject</th><th>Marks</th><th>Answer</th><th>Actions</th></tr>
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
                                            <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>{q.marks}</td>
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
                                                <button onClick={() => startEdit(q)} style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                                <button onClick={() => deleteQ(q._id)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {questions.length === 0 && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No questions found</td></tr>
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
