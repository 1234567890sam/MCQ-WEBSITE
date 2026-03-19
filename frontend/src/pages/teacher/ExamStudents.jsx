import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus, Search, Users } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ExamStudents() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState(null);
    const [allStudents, setAllStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [examRes, studRes] = await Promise.all([
                api.get(`/teacher/exams/${id}`),
                api.get('/teacher/students'),
            ]);
            setExam(examRes.data.exam);
            setAllStudents(studRes.data.students);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [id]);

    const allowedIds = new Set(exam?.allowedStudents?.map(s => s._id || s) || []);

    const handleToggle = async (studentId, add) => {
        try {
            await api.put(`/teacher/exams/${id}/students`, {
                addStudents: add ? [studentId] : [],
                removeStudents: add ? [] : [studentId],
            });
            toast.success(add ? 'Student added' : 'Student removed');
            fetchData();
        } catch { toast.error('Failed to update students'); }
    };

    const handleAddAll = async () => {
        const notAdded = filtered.filter(s => !allowedIds.has(s._id)).map(s => s._id);
        if (!notAdded.length) return toast('All filtered students already added');
        try {
            await api.put(`/teacher/exams/${id}/students`, { addStudents: notAdded, removeStudents: [] });
            toast.success(`Added ${notAdded.length} students`);
            fetchData();
        } catch { toast.error('Failed to add all'); }
    };

    const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.studentId || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Manage Students</h1>
                        {exam && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{exam.title} — {allowedIds.size} students assigned</p>}
                    </div>
                </div>
                <button onClick={handleAddAll} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6' }}>
                    <Users size={18} /> Add All Filtered
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students by name, email or ID..." className="input" style={{ paddingLeft: '2.5rem' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student Details</th>
                                <th>Department / Sem</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found</td></tr>
                            ) : filtered.map(s => {
                                const added = allowedIds.has(s._id);
                                return (
                                    <tr key={s._id} style={{ background: added ? 'rgba(139,92,246,0.03)' : 'transparent' }}>
                                        <td>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email} • ID: {s.studentId || 'N/A'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.8rem' }}>{s.department || 'N/A'}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Semester: {s.semester || 'N/A'}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button onClick={() => handleToggle(s._id, !added)} className={added ? "btn-danger" : "btn-secondary"} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                                                {added ? 'Remove' : 'Add Student'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
