import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';
import { Plus, BookOpen, Users, ToggleLeft, ToggleRight, Eye, Download, Trash2, Shield, ShieldCheck, FileSpreadsheet, X, Clock, Search, ChevronRight, ChevronDown, Settings, UserCheck, Upload, CheckCircle2, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { NavLink } from 'react-router-dom';

// ── Step Indicator ─────────────────────────────────────────────────────────────
function StepBadge({ n, label, active, done }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? '#10b981' : active ? '#6366f1' : '#e2e8f0',
                color: done || active ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.85rem',
                transition: 'all 0.3s', boxShadow: active ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none'
            }}>
                {done ? <CheckCircle2 size={18} /> : n}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: active ? '#6366f1' : done ? '#10b981' : '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
        </div>
    );
}

export default function ExamSessions() {
    const [sessions, setSessions] = useState([]);
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [examStudents, setExamStudents] = useState([]);
    const [examTeachers, setExamTeachers] = useState([]);
    const [createdSession, setCreatedSession] = useState(null);
    const [step, setStep] = useState(1);
    const fileInputRef = useRef();

    const [form, setForm] = useState({ title: '', subject: '', duration: 60, negativeMarking: false, passingMarks: 40 });
    const [questionsFile, setQuestionsFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedTeachers, setSelectedTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    const fetchSessions = async () => {
        try {
            const { data } = await api.get('/college-admin/exam-sessions');
            setSessions(data.sessions || []);
        } catch { toast.error('Failed to load exam sessions'); }
        finally { setLoading(false); }
    };

    const fetchExamStudents = async () => {
        try { const { data } = await api.get('/college-admin/eligible-students'); setExamStudents(data.students || []); } catch { }
    };

    const fetchTeachers = async () => {
        try { const { data } = await api.get('/college-admin/teachers'); setExamTeachers(data.teachers || []); } catch { }
    };

    useEffect(() => { fetchSessions(); fetchExamStudents(); fetchTeachers(); }, []);

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

    const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

    const selectBatch = (studentList, isChecked) => {
        const ids = studentList.map(s => s._id);
        setSelectedStudents(prev => {
            if (isChecked) return Array.from(new Set([...prev, ...ids]));
            return prev.filter(id => !ids.includes(id));
        });
    };

    const handleFileDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.xlsx')) setQuestionsFile(file);
        else toast.error('Please drop a .xlsx file');
    };

    const openForm = () => { setStep(1); setCreatedSession(null); setShowForm(true); };
    const closeForm = () => { setShowForm(false); setCreatedSession(null); setStep(1); };

    const handleCreate = async () => {
        if (!questionsFile) return toast.error('Please upload a questions Excel file');
        setCreating(true);
        const fd = new FormData();
        fd.append('file', questionsFile);
        fd.append('title', form.title);
        fd.append('subject', form.subject);
        fd.append('duration', form.duration);
        fd.append('negativeMarking', form.negativeMarking);
        fd.append('passingMarks', form.passingMarks);
        if (selectedStudents.length > 0) fd.append('allowedStudentIds', JSON.stringify(selectedStudents));
        if (selectedTeachers.length > 0) fd.append('assignedTeacherIds', JSON.stringify(selectedTeachers));
        try {
            const { data } = await api.post('/college-admin/exam-sessions', fd);
            toast.success('Exam session created!');
            setCreatedSession(data.session);
            setForm({ title: '', subject: '', duration: 60, negativeMarking: false, passingMarks: 40 });
            setQuestionsFile(null); setSelectedStudents([]); setSelectedTeachers([]);
            fetchSessions();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed to create exam'); }
        finally { setCreating(false); }
    };

    const downloadTestCodes = async (sessionId, title) => {
        try {
            const r = await api.get(`/college-admin/exam-sessions/${sessionId}/test-code-excel`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a'); a.href = url; a.download = `${title || 'Exam'}_Attendance_Codes.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            toast.success('Attendance Excel downloaded');
        } catch { toast.error('Download failed'); }
    };

    const toggleActive = async (session) => {
        try { const { data } = await api.patch(`/college-admin/exam-sessions/${session._id}/toggle-active`); toast.success(data.message); fetchSessions(); }
        catch { toast.error('Failed to update session'); }
    };

    const toggleResults = async (session) => {
        try { const { data } = await api.patch(`/college-admin/exam-sessions/${session._id}/toggle-results`); toast.success(data.message); fetchSessions(); }
        catch { toast.error('Failed to update session'); }
    };

    const deleteSession = async (id) => {
        if (!await confirm('This exam session and all its data will be permanently deleted.', { title: 'Delete Exam Session?', variant: 'danger', confirmLabel: 'Delete' })) return;
        try { await api.delete(`/college-admin/exam-sessions/${id}`); toast.success('Session deleted'); fetchSessions(); }
        catch { toast.error('Delete failed'); }
    };

    const exportResults = async (id, title) => {
        try {
            const r = await api.get(`/college-admin/exam-sessions/${id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a'); a.href = url; a.download = `${title || 'Exam'}_Results.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            toast.success('Excel exported');
        } catch { toast.error('Export failed'); }
    };

    const downloadSample = async () => {
        try {
            const r = await api.get('/college-admin/download-sample/questions', { responseType: 'blob' });
            const url = window.URL.createObjectURL(r.data);
            const a = document.createElement('a'); a.href = url; a.download = 'sample_questions.xlsx';
            document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            toast.success('Sample template downloaded');
        } catch { toast.error('Sample download failed'); }
    };

    const step1Valid = form.title.trim() && form.subject.trim();
    const step2Valid = !!questionsFile;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Exam Sessions</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Create and manage exam sessions with secure test codes</p>
                </div>
                <button className="btn-primary" onClick={openForm}><Plus size={18} /> New Exam Session</button>
            </div>

            {/* ── Create Session Wizard Modal ──────────────────────────────── */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: '1rem', backdropFilter: 'blur(6px)' }}>
                    <div style={{ width: '100%', maxWidth: 640, maxHeight: '92vh', background: 'white', borderRadius: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Create New Exam Session</div>
                                {!createdSession && <div style={{ fontSize: '0.72rem', opacity: 0.8, marginTop: '0.1rem' }}>Step {step} of 3</div>}
                            </div>
                            <button onClick={closeForm} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', padding: '0.4rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'white' }}><X size={18} /></button>
                        </div>

                        {/* Step Progress Bar */}
                        {!createdSession && (
                            <div style={{ padding: '1rem 2rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                    <StepBadge n={1} label="Exam Details" active={step === 1} done={step > 1} />
                                    <div style={{ flex: 1, height: 2, background: step > 1 ? '#10b981' : '#e2e8f0', marginTop: 17, transition: 'background 0.4s' }} />
                                    <StepBadge n={2} label="Questions" active={step === 2} done={step > 2} />
                                    <div style={{ flex: 1, height: 2, background: step > 2 ? '#10b981' : '#e2e8f0', marginTop: 17, transition: 'background 0.4s' }} />
                                    <StepBadge n={3} label="Students" active={step === 3} done={false} />
                                </div>
                            </div>
                        )}

                        {/* Scrollable Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem' }}>

                            {/* SUCCESS */}
                            {createdSession ? (
                                <div className="animate-fade-in" style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                                        <CheckCircle2 size={36} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>Exam Session Published! 🎉</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.875rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
                                        <strong>{createdSession.title}</strong> is now live. Unique test codes have been generated for all students.
                                    </p>
                                    <div style={{ background: 'rgba(139,92,246,0.07)', border: '2px dashed #8b5cf6', borderRadius: '1rem', padding: '1.25rem 2rem', marginBottom: '1.5rem', display: 'inline-block' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>Session Code</div>
                                        <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#8b5cf6', letterSpacing: '0.2em', fontFamily: 'monospace' }}>{createdSession.sessionCode}</div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360, margin: '0 auto' }}>
                                        <button onClick={() => downloadTestCodes(createdSession._id, createdSession.title)} className="btn-primary" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.9rem', borderRadius: '0.875rem', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', fontSize: '0.9rem' }}>
                                            <FileSpreadsheet size={18} /> Download Attendance &amp; Test Codes
                                        </button>
                                        <button onClick={closeForm} className="btn-secondary" style={{ padding: '0.75rem', borderRadius: '0.875rem' }}>Back to Sessions List</button>
                                    </div>
                                </div>

                            ) : step === 1 ? (
                                /* STEP 1: Exam Details */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', color: '#374151' }}>Exam Title *</label>
                                        <input className="input" placeholder="e.g. Mid-Semester Examination 2025" required value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            style={{ fontSize: '0.95rem', padding: '0.75rem 1rem' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', color: '#374151' }}>Subject *</label>
                                        <input className="input" placeholder="e.g. Engineering Mathematics" required value={form.subject}
                                            onChange={e => setForm({ ...form, subject: e.target.value })}
                                            style={{ fontSize: '0.95rem', padding: '0.75rem 1rem' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.6rem', color: '#374151' }}>
                                                Duration: <span style={{ color: '#6366f1', fontWeight: 800 }}>{form.duration} min</span>
                                            </label>
                                            <input type="range" min={10} max={180} step={5} value={form.duration}
                                                onChange={e => setForm({ ...form, duration: parseInt(e.target.value) })}
                                                style={{ width: '100%', accentColor: '#6366f1', cursor: 'pointer' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                <span>10 min</span><span>3 hrs</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.6rem', color: '#374151' }}>
                                                Passing: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{form.passingMarks}%</span>
                                            </label>
                                            <input type="range" min={10} max={100} step={5} value={form.passingMarks}
                                                onChange={e => setForm({ ...form, passingMarks: parseInt(e.target.value) })}
                                                style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                <span>10%</span><span>100%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div onClick={() => setForm({ ...form, negativeMarking: !form.negativeMarking })}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', borderRadius: '0.875rem', border: `2px solid ${form.negativeMarking ? '#ef4444' : '#e2e8f0'}`, background: form.negativeMarking ? 'rgba(239,68,68,0.04)' : '#fafafa', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${form.negativeMarking ? '#ef4444' : '#cbd5e1'}`, background: form.negativeMarking ? '#ef4444' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                                            {form.negativeMarking && <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>✓</span>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: form.negativeMarking ? '#ef4444' : '#374151' }}>Negative Marking</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>-0.25 marks deducted per wrong answer</div>
                                        </div>
                                        {form.negativeMarking && <AlertTriangle size={16} color="#ef4444" style={{ marginLeft: 'auto' }} />}
                                    </div>
                                </div>

                            ) : step === 2 ? (
                                /* STEP 2: Upload Questions + Teachers */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                            <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#374151' }}>Upload Questions Excel *</label>
                                            <button type="button" onClick={downloadSample} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Download size={12} /> Download Sample
                                            </button>
                                        </div>

                                        {/* Drag & Drop Zone */}
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleFileDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                border: `2px dashed ${questionsFile ? '#10b981' : dragOver ? '#6366f1' : '#d1d5db'}`,
                                                borderRadius: '1rem', padding: '2.5rem 1.5rem', textAlign: 'center',
                                                background: questionsFile ? 'rgba(16,185,129,0.04)' : dragOver ? 'rgba(99,102,241,0.04)' : '#fafafa',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}>
                                            <input ref={fileInputRef} type="file" accept=".xlsx" hidden onChange={e => setQuestionsFile(e.target.files[0])} />
                                            {questionsFile ? (
                                                <>
                                                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                                                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>{questionsFile.name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.3rem' }}>Click to change file</div>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={36} color={dragOver ? '#6366f1' : '#94a3b8'} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                                                    <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.9rem' }}>Drag &amp; drop your Excel file here</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' }}>or <span style={{ color: '#6366f1', fontWeight: 600 }}>click to browse</span> — .xlsx only</div>
                                                </>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                                            Required columns: <strong>QUESTION, OPTION A, OPTION B, OPTION C, OPTION D, ANSWER, SUBJECT, MARKS</strong>
                                        </div>
                                    </div>

                                    {/* Assign Teachers */}
                                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '1rem', padding: '1.25rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.8rem', color: '#0369a1', marginBottom: '0.75rem' }}>
                                            <UserCheck size={15} /> Assign Teachers
                                            <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.72rem' }}>({selectedTeachers.length} selected) — optional</span>
                                        </label>
                                        {examTeachers.length === 0 ? (
                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>No teachers found in this college.</div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 150, overflowY: 'auto' }}>
                                                {examTeachers.map(t => (
                                                    <label key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', cursor: 'pointer', padding: '0.5rem 0.75rem', borderRadius: '0.6rem', background: selectedTeachers.includes(t._id) ? 'rgba(14,165,233,0.12)' : 'white', border: `1px solid ${selectedTeachers.includes(t._id) ? '#7dd3fc' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
                                                        <input type="checkbox" checked={selectedTeachers.includes(t._id)}
                                                            onChange={e => setSelectedTeachers(prev => e.target.checked ? [...prev, t._id] : prev.filter(id => id !== t._id))} />
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{t.name}</span>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginLeft: 'auto' }}>{t.email}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                            ) : (
                                /* STEP 3: Select Students */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>Select Allowed Students</div>
                                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                                                {selectedStudents.length === 0 ? 'Empty = all students allowed' : `${selectedStudents.length} selected`}
                                            </div>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input className="input" placeholder="Search student..." value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                style={{ padding: '0.45rem 0.75rem 0.45rem 2rem', fontSize: '0.82rem', width: 190, borderRadius: '0.6rem' }} />
                                        </div>
                                    </div>

                                    {selectedStudents.length === 0 && (
                                        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle2 size={15} /> Open to <strong style={{ margin: '0 0.25rem' }}>all students</strong> in your college
                                        </div>
                                    )}

                                    {examStudents.length === 0 ? (
                                        <div style={{ padding: '2rem', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #e2e8f0', borderRadius: '0.75rem', textAlign: 'center' }}>No students found.</div>
                                    ) : (
                                        <div style={{ overflowY: 'auto', maxHeight: 340, display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
                                            {Object.keys(filteredGroups).length === 0 ? (
                                                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>No students match your search.</div>
                                            ) : Object.keys(filteredGroups).map(dept => (
                                                <div key={dept} style={{ border: '1.5px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden', background: 'white' }}>
                                                    <div style={{ padding: '0.65rem 0.875rem', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                        <button type="button" onClick={() => toggleGroup(dept)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748b' }}>
                                                            {expandedGroups[dept] ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                        </button>
                                                        <input type="checkbox"
                                                            checked={Object.values(filteredGroups[dept]).flat().every(s => selectedStudents.includes(s._id))}
                                                            onChange={e => selectBatch(Object.values(filteredGroups[dept]).flat(), e.target.checked)} />
                                                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{dept}</span>
                                                        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#64748b', background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '99px' }}>
                                                            {Object.values(filteredGroups[dept]).flat().length}
                                                        </span>
                                                    </div>

                                                    {(expandedGroups[dept] || searchTerm) && (
                                                        <div style={{ padding: '0.6rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                                            {Object.keys(filteredGroups[dept]).map(sem => (
                                                                <div key={sem}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                                        <input type="checkbox"
                                                                            checked={filteredGroups[dept][sem].every(s => selectedStudents.includes(s._id))}
                                                                            onChange={e => selectBatch(filteredGroups[dept][sem], e.target.checked)} />
                                                                        <span style={{ fontWeight: 700, fontSize: '0.72rem', color: '#6366f1' }}>Semester {sem}</span>
                                                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>({filteredGroups[dept][sem].length} students)</span>
                                                                    </div>
                                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', paddingLeft: '1.5rem' }}>
                                                                        {filteredGroups[dept][sem].map(s => (
                                                                            <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', padding: '0.3rem 0.5rem', borderRadius: '0.4rem', background: selectedStudents.includes(s._id) ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'background 0.1s' }}>
                                                                                <input type="checkbox" checked={selectedStudents.includes(s._id)}
                                                                                    onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s._id] : prev.filter(id => id !== s._id))} />
                                                                                <span style={{ fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!createdSession && (
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: '#fafafa' }}>
                                {step > 1 ? (
                                    <button type="button" onClick={() => setStep(s => s - 1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <ArrowLeft size={15} /> Back
                                    </button>
                                ) : (
                                    <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
                                )}
                                {step < 3 ? (
                                    <button type="button" onClick={() => setStep(s => s + 1)}
                                        disabled={step === 1 ? !step1Valid : !step2Valid}
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: (step === 1 ? !step1Valid : !step2Valid) ? 0.45 : 1 }}>
                                        Next <ArrowRight size={15} />
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleCreate} disabled={creating}
                                        className="btn-primary"
                                        style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg,#10b981,#059669)', opacity: creating ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
                                        {creating
                                            ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating…</>
                                            : <><CheckCircle2 size={16} /> Create Exam Session</>}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Sessions List ────────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : sessions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <BookOpen size={48} color="#10b981" style={{ margin: '0 auto 1rem', display: 'block' }} />
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
                                        <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.9rem', fontFamily: 'monospace', letterSpacing: '0.1em', border: '1px dashed #10b981' }}>{session.sessionCode}</div>
                                        <span className="badge" style={{ background: session.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: session.isActive ? '#10b981' : '#64748b' }}>{session.isActive ? '● LIVE' : '○ Closed'}</span>
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
                                    <button onClick={() => toggleActive(session)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `1px solid ${session.isActive ? '#10b981' : '#e2e8f0'}`, background: session.isActive ? 'rgba(16,185,129,0.08)' : 'transparent', color: session.isActive ? '#10b981' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        {session.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />} {session.isActive ? 'Close' : 'Open'}
                                    </button>
                                    <button onClick={() => toggleResults(session)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `1px solid ${session.showResults ? '#06b6d4' : '#e2e8f0'}`, background: session.showResults ? 'rgba(6,182,212,0.08)' : 'transparent', color: session.showResults ? '#06b6d4' : '#64748b', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        {session.showResults ? <ShieldCheck size={15} /> : <Shield size={15} />} {session.showResults ? 'Hide Results' : 'Release Results'}
                                    </button>
                                    <NavLink to={`/college-admin/exam-sessions/${session._id}/results`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none' }}>
                                        <Eye size={15} /> Results
                                    </NavLink>
                                    <NavLink to={`/college-admin/exam-sessions/${session._id}/manage`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#b45309', fontWeight: 600, fontSize: '0.78rem', textDecoration: 'none' }}>
                                        <Settings size={15} /> Manage
                                    </NavLink>
                                    <button onClick={() => downloadTestCodes(session._id, session.title)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #8b5cf6', background: 'rgba(139,92,246,0.06)', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        <Shield size={15} /> All Codes
                                    </button>
                                    <button onClick={() => exportResults(session._id, session.sessionCode)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #10b981', background: 'rgba(16,185,129,0.06)', color: '#10b981', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
                                        <Download size={15} /> Export
                                    </button>
                                    <button onClick={() => deleteSession(session._id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #fee2e2', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>
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
