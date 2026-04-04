import { useEffect, useState } from 'react';
import { Search, FileText, Trash2, Clock, CheckCircle, X, ExternalLink, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CollegeManageExams() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchExams = (q = '') => {
        api.get(`/college-admin/exams?search=${q}`)
            .then(r => setExams(r.data.exams || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExams(); }, []);

    const handleSearch = (e) => {
        setSearch(e.target.value);
        fetchExams(e.target.value);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this exam?')) return;
        try {
            await api.delete(`/college-admin/exams/${id}`);
            toast.success('Exam deleted');
            fetchExams(search);
        } catch { toast.error('Failed'); }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Manage Exams</h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>View and oversee all examinations created within the college</p>
            </div>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={handleSearch} placeholder="Search by title, subject, or department..." className="input" style={{ paddingLeft: '2.5rem' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Exam Details</th>
                                <th>Subject/Dept</th>
                                <th>Schedule</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : exams.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No exams found</td></tr>
                            ) : exams.map(e => (
                                <tr key={e._id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{e.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{e.questions?.length || 0} Questions • Creator: {e.createdBy?.name || 'Deleted'}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>{e.subject}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{e.department || 'N/A'}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Clock size={12} /> {e.duration} mins</div>
                                            <div>{new Date(e.date).toLocaleDateString()}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
                                            Published
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <Link to={`/college-admin/exam-sessions/${e._id}/manage`} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#b45309', borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
                                                <Settings size={14} /> Manage
                                            </Link>
                                            <button onClick={() => handleDelete(e._id)} className="btn-danger" style={{ padding: '0.4rem' }}>
                                                <Trash2 size={16} />
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
