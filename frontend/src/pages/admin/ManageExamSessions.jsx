import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';
import { Plus, BookOpen, Users, ToggleLeft, ToggleRight, Eye, Download, Trash2, Shield, ShieldCheck, FileSpreadsheet, X, Clock, Search, ChevronRight, ChevronDown } from 'lucide-react';

export default function ManageExamSessions() {
    const [sessions, setSessions] = useState([]);
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [examStudents, setExamStudents] = useState([]);

    // Create form state
    const [form, setForm] = useState({ title: '', subject: '', duration: 60, negativeMarking: false });
    const [questionsFile, setQuestionsFile] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    const fetchSessions = async () => {
        try {
            const { data } = await api.get('/admin/exam-sessions');
            setSessions(data.sessions || []);
        } catch { toast.error('Failed to load exam sessions'); }
        finally { setLoading(false); }
    };

    const fetchExamStudents = async () => {
        try {
            const { data } = await api.get('/admin/eligible-students');
            setExamStudents(data.students || []);
        } catch { }
    };

    useEffect(() => { fetchSessions(); fetchExamStudents(); }, []);

    // Grouping logic
    const groupedStudents = examStudents.reduce((acc, student) => {
        const dept = student.department || 'General';
        const sem = student.semester || 'N/A';
        if (!acc[dept]) acc[dept] = {};
        if (!acc[dept][sem]) acc[dept][sem] = [];
        acc[dept][sem].push(student);
        return acc;
    }, {});

    const filteredGroups = Object.keys(groupedStudents).reduce((acc, dept) => {
        const semGroups = Object.keys(groupedStudents[dept]).reduce((sAcc, sem) => {
            const students = groupedStudents[dept][sem].filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.studentId && s.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            if (students.length > 0) sAcc[sem] = students;
            return sAcc;
        }, {});
        if (Object.keys(semGroups).length > 0) acc[dept] = semGroups;
        return acc;
    }, {});

    const toggleGroup = (key) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectBatch = (studentList, isChecked) => {
        const ids = studentList.map(s => s._id);
        setSelectedStudents(prev => {
            if (isChecked) return Array.from(new Set([...prev, ...ids]));
            return prev.filter(id => !ids.includes(id));
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!questionsFile) return toast.error('Please upload a questions Excel file');
        setCreating(true);
        const fd = new FormData();
        fd.append('file', questionsFile);
        fd.append('title', form.title);
        fd.append('subject', form.subject);
        fd.append('duration', form.duration);
        fd.append('negativeMarking', form.negativeMarking);
        if (selectedStudents.length > 0) fd.append('allowedStudentIds', JSON.stringify(selectedStudents));
        try {
            const { data } = await api.post('/admin/exam-sessions', fd);
            toast.success(`Exam created! Code: ${data.sessionCode}`);
            setShowForm(false);
            setForm({ title: '', subject: '', duration: 60, negativeMarking: false });
            setQuestionsFile(null);
            setSelectedStudents([]);
            fetchSessions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create exam');
        } finally { setCreating(false); }
    };

    const toggleActive = async (session) => {
        try {
            const { data } = await api.patch(`/admin/exam-sessions/${session._id}/toggle-active`);
            toast.success(data.message);
            fetchSessions();
        } catch { toast.error('Failed to update session'); }
    };

    const toggleResults = async (session) => {
        try {
            const { data } = await api.patch(`/admin/exam-sessions/${session._id}/toggle-results`);
            toast.success(data.message);
            fetchSessions();
        } catch { toast.error('Failed to update session'); }
    };

    const deleteSession = async (id) => {
        if (!await confirm('This exam session and all its data will be permanently deleted.', { title: 'Delete Exam Session?', variant: 'danger', confirmLabel: 'Delete' })) return;
        try {
            await api.delete(`/admin/exam-sessions/${id}`);
            toast.success('Session deleted');
            fetchSessions();
        } catch { toast.error('Delete failed'); }
    };

    const exportResults = async (id, title) => {
        try {
            const r = await api.get(`/admin/exam-sessions/${id}/export`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'Exam'}_Results.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Excel exported successfully');
        } catch { toast.error('Export failed'); }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Exam Sessions</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Create and manage university exam sessions with secure test codes</p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={18} /> New Exam Session
                </button>
            </div>

            {/* Create Session Modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 1100, maxHeight: '85vh', background: '#ffffff', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', borderRadius: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>Create New Exam Session</div>
                            <button onClick={() => setShowForm(false)} style={{ border: 'none', background: 'white', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', color: '#64748b' }}><X size={18} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.3fr', gap: '2rem' }}>
                                {/* Left Column: Basic Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Exam Title *</label>
                                        <input className="input" placeholder="e.g. Mid-term Exam 2025" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Subject *</label>
                                        <input className="input" placeholder="e.g. Mathematics" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                            Duration: <span style={{ color: '#6366f1' }}>{form.duration} minutes</span>
                                        </label>
                                        <input type="range" min={10} max={180} step={5} value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#6366f1' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', border: `2px solid ${form.negativeMarking ? '#ef4444' : 'var(--border-light)'}`, background: form.negativeMarking ? 'rgba(239,68,68,0.05)' : 'transparent', cursor: 'pointer' }}
                                        onClick={() => setForm({ ...form, negativeMarking: !form.negativeMarking })}>
                                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form.negativeMarking ? '#ef4444' : '#94a3b8'}`, background: form.negativeMarking ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {form.negativeMarking && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Negative Marking (-0.25)</div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                            <FileSpreadsheet size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                            Upload Questions Excel *
                                        </label>
                                        <input type="file" accept=".xlsx" onChange={e => setQuestionsFile(e.target.files[0])}
                                            style={{ width: '100%', padding: '0.6rem', border: '2px dashed var(--border-light)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }} />
                                        {questionsFile && <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: 4 }}>✓ {questionsFile.name}</div>}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Columns: QUESTION, OPTIONS, ANSWER...</div>
                                            <button type="button" onClick={async () => {
                                                try {
                                                    const r = await api.get('/admin/download-sample/questions', { responseType: 'blob' });
                                                    const url = URL.createObjectURL(new Blob([r.data]));
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'sample_questions.xlsx';
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    document.body.removeChild(a);
                                                    URL.revokeObjectURL(url);
                                                } catch { toast.error('Sample download failed'); }
                                            }}
                                                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Download size={12} /> Sample
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Student Selection */}
                                <div style={{ border: '1px solid var(--border-light)', borderRadius: '1.25rem', padding: '1.5rem', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                        <label style={{ fontWeight: 800, fontSize: '1rem' }}>Allowed Candidates ({selectedStudents.length})</label>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input 
                                                className="input" 
                                                placeholder="Search name, ID..." 
                                                value={searchTerm} 
                                                onChange={e => setSearchTerm(e.target.value)}
                                                style={{ padding: '0.4rem 0.75rem 0.4rem 2rem', fontSize: '0.85rem', width: 220, borderRadius: '0.5rem' }} 
                                            />
                                        </div>
                                    </div>

                                    {examStudents.length === 0 ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', border: '1px dashed #e2e8f0', borderRadius: '0.5rem' }}>
                                            No candidates found.
                                        </div>
                                    ) : (
                                        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.5rem' }}>
                                            {Object.keys(filteredGroups).length === 0 ? (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No results match.</div>
                                            ) : (
                                                Object.keys(filteredGroups).map(dept => (
                                                    <div key={dept} style={{ border: '1px solid var(--border-light)', borderRadius: '0.75rem', background: 'white', overflow: 'hidden' }}>
                                                        <div style={{ padding: '0.4rem 0.6rem', background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <button type="button" onClick={() => toggleGroup(dept)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                                                {expandedGroups[dept] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            </button>
                                                            <input type="checkbox" 
                                                                checked={Object.values(filteredGroups[dept]).flat().every(s => selectedStudents.includes(s._id))}
                                                                onChange={e => selectBatch(Object.values(filteredGroups[dept]).flat(), e.target.checked)}
                                                            />
                                                            <span style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept}</span>
                                                        </div>

                                                        {(expandedGroups[dept] || searchTerm) && (
                                                            <div style={{ padding: '0.4rem' }}>
                                                                {Object.keys(filteredGroups[dept]).map(sem => (
                                                                    <div key={sem} style={{ marginBottom: '0.4rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', paddingLeft: '0.4rem' }}>
                                                                            <input type="checkbox" 
                                                                                checked={filteredGroups[dept][sem].every(s => selectedStudents.includes(s._id))}
                                                                                onChange={e => selectBatch(filteredGroups[dept][sem], e.target.checked)}
                                                                            />
                                                                            <span style={{ fontWeight: 600, fontSize: '0.7rem', color: '#6366f1' }}>Sem {sem}</span>
                                                                        </div>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.15rem', paddingLeft: '1.25rem' }}>
                                                                            {filteredGroups[dept][sem].map(s => (
                                                                                <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', cursor: 'pointer', padding: '0.15rem' }}>
                                                                                    <input type="checkbox" checked={selectedStudents.includes(s._id)}
                                                                                        onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id))} />
                                                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={creating} style={{ flex: 2, justifyContent: 'center', opacity: creating ? 0.7 : 1 }}>
                                    <Plus size={16} /> {creating ? 'Creating…' : 'Create Exam Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            )}

            {/* Sessions list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : sessions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={48} color="#6366f1" style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No exam sessions yet</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Create your first exam session to get started</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {sessions.map(session => (
                        <div key={session._id} className="card" style={{ borderLeft: `4px solid ${session.isActive ? '#10b981' : '#e2e8f0'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{session.title}</div>
                                        {/* Session code badge */}
                                        <div style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: '0.1em', border: '1px dashed #6366f1' }}>
                                            {session.sessionCode}
                                        </div>
                                        <span className={`badge`} style={{ background: session.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: session.isActive ? '#10b981' : '#64748b' }}>
                                            {session.isActive ? '● LIVE' : '○ Closed'}
                                        </span>
                                        {session.showResults && <span className="badge" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>Results Released</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#64748b' }}>
                                        <span><BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{session.subject}</span>
                                        <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{session.duration} min</span>
                                        <span><Users size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />{session.attemptCount || 0} submitted</span>
                                        <span style={{ color: '#94a3b8' }}>{new Date(session.createdAt).toLocaleDateString('en-IN')}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {/* Toggle Active */}
                                    <button onClick={() => toggleActive(session)} title={session.isActive ? 'Close exam' : 'Open exam'}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `1px solid ${session.isActive ? '#10b981' : '#e2e8f0'}`, background: session.isActive ? 'rgba(16,185,129,0.08)' : 'transparent', color: session.isActive ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        {session.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                                        {session.isActive ? 'Close' : 'Open'}
                                    </button>
                                    {/* Toggle Results */}
                                    <button onClick={() => toggleResults(session)} title={session.showResults ? 'Hide results' : 'Release results'}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `1px solid ${session.showResults ? '#06b6d4' : '#e2e8f0'}`, background: session.showResults ? 'rgba(6,182,212,0.08)' : 'transparent', color: session.showResults ? '#06b6d4' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        {session.showResults ? <ShieldCheck size={15} /> : <Shield size={15} />}
                                        {session.showResults ? 'Hide Results' : 'Release Results'}
                                    </button>
                                    {/* View Results */}
                                    <a href={`/admin/exam-sessions/${session._id}/results`}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none' }}>
                                        <Eye size={15} /> Results
                                    </a>
                                    {/* Export */}
                                    <button onClick={() => exportResults(session._id, session.sessionCode)} title="Export to Excel"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #10b981', background: 'rgba(16,185,129,0.06)', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        <Download size={15} /> Export
                                    </button>
                                    {/* Delete */}
                                    <button onClick={() => deleteSession(session._id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #fee2e2', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
