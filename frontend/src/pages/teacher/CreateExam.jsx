import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    FileText, Clock, Upload, Download, CheckCircle, ArrowRight,
    ArrowLeft, Save, Plus, Trash2, Eye, AlertCircle, ListChecks,
    Brain, Search, Users, ChevronRight, ChevronDown, UserCheck, Lock
} from 'lucide-react';

const STEPS = [
    { id: 1, label: 'Exam Details',       icon: FileText  },
    { id: 2, label: 'Add Questions',      icon: Upload    },
    { id: 3, label: 'Select Students',    icon: Users     },
    { id: 4, label: 'Review & Save',      icon: Eye       },
];

const emptyQuestion = () => ({ questionText: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 });

export default function CreateExam() {
    const navigate = useNavigate();
    const [step, setStep]       = useState(1);
    const [saving, setSaving]   = useState(false);
    const [uploading, setUploading] = useState(false);
    const [subjects, setSubjects]   = useState([]);

    // Student selector state
    const [allStudents, setAllStudents]         = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchTerm, setSearchTerm]           = useState('');
    const [expandedGroups, setExpandedGroups]   = useState({});

    const [form, setForm] = useState({
        title: '', subject: '', date: '', duration: 30, passingMarks: 40, questions: [],
    });

    useEffect(() => {
        api.get('/teacher/subjects').then(r => setSubjects(r.data.subjects || [])).catch(() => {});
        api.get('/teacher/students').then(r => setAllStudents(r.data.students || [])).catch(() => {});
    }, []);

    // ── Grouping ──────────────────────────────────────────────────────────────
    const grouped = allStudents.reduce((acc, s) => {
        const dept = s.department || 'General';
        const sem  = s.semester || 'N/A';
        if (!acc[dept]) acc[dept] = {};
        if (!acc[dept][sem]) acc[dept][sem] = [];
        acc[dept][sem].push(s);
        return acc;
    }, {});

    const filtered = Object.keys(grouped).reduce((acc, dept) => {
        const semGroups = Object.keys(grouped[dept]).reduce((sAcc, sem) => {
            const students = grouped[dept][sem].filter(s =>
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

    const toggleGroup  = (key) => setExpandedGroups(p => ({ ...p, [key]: !p[key] }));
    const selectBatch  = (list, checked) => {
        const ids = list.map(s => s._id);
        setSelectedStudents(p => checked ? Array.from(new Set([...p, ...ids])) : p.filter(id => !ids.includes(id)));
    };
    const toggleOne    = (id, checked) => setSelectedStudents(p => checked ? [...p, id] : p.filter(x => x !== id));

    // ── Step 1 ────────────────────────────────────────────────────────────────
    const step1Valid = form.title.trim() && form.subject.trim();

    // ── Step 2: Bulk upload ───────────────────────────────────────────────────
    const downloadSample = async () => {
        try {
            const r = await api.get('/teacher/download-sample', { responseType: 'blob' });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement('a'); a.href = url;
            a.download = 'exam_questions_sample.xlsx';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch { toast.error('Download failed'); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file);
        setUploading(true);
        const tid = toast.loading('Parsing questions...');
        try {
            const { data } = await api.post('/teacher/bulk-parse-questions', fd);
            if (data.success) {
                const newQs = data.questions.map(q => ({
                    questionText: q.question, options: q.options,
                    correctAnswer: ['A','B','C','D'].indexOf(q.correctAnswer),
                    subject: q.subject, cos: q.cos, points: q.marks || 1,
                }));
                setForm(p => ({ ...p, questions: [...p.questions, ...newQs] }));
                toast.success(`${newQs.length} questions imported!`, { id: tid });
            }
        } catch (err) { toast.error(err.response?.data?.message || 'Upload failed', { id: tid }); }
        finally { setUploading(false); e.target.value = ''; }
    };

    const addManualQuestion = () =>
        setForm(p => ({ ...p, questions: [...p.questions, emptyQuestion()] }));

    const removeQuestion = (idx) =>
        setForm(p => ({ ...p, questions: p.questions.filter((_, i) => i !== idx) }));

    const updateQ = (idx, field, val) => {
        const qs = [...form.questions]; qs[idx] = { ...qs[idx], [field]: val };
        setForm(p => ({ ...p, questions: qs }));
    };
    const updateOpt = (qIdx, oIdx, val) => {
        const qs = [...form.questions]; const opts = [...qs[qIdx].options];
        opts[oIdx] = val; qs[qIdx] = { ...qs[qIdx], options: opts };
        setForm(p => ({ ...p, questions: qs }));
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const [createdExam, setCreatedExam] = useState(null);

    const handleSubmit = async () => {
        if (form.questions.length === 0) return toast.error('Please add at least one question');
        setSaving(true);
        try {
            const { data } = await api.post('/teacher/exams', {
                ...form,
                allowedStudents: selectedStudents,
            });
            toast.success('Exam created successfully!');
            setCreatedExam(data.exam);
            // Don't navigate away yet, show the success state
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error creating exam');
        } finally { setSaving(false); }
    };

    const handleDownloadCodes = async () => {
        if (!createdExam) return;
        try {
            const r = await api.get(`/teacher/exams/${createdExam._id}/test-code-excel`, { responseType: 'blob' });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement('a'); a.href = url;
            a.download = `${createdExam.title}_Attendance_Codes.xlsx`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        } catch { toast.error('Download failed'); }
    };

    const hasErrors = form.questions.some(
        q => !q.questionText.trim() || q.options.some(o => !o.trim())
    );

    // ── UI ────────────────────────────────────────────────────────────────────
    if (createdExam) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
                <div className="card" style={{ padding: '3rem 2rem', borderTop: '6px solid #10b981' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <CheckCircle size={40} color="#10b981" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Exam Published!</h2>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                        Your exam <strong>{createdExam.title}</strong> is now live. Every student has been assigned a <strong>UNIQUE 6-digit test code</strong> for maximum security.
                    </p>

                    <div style={{ background: 'var(--card-light)', border: '2px dashed #8b5cf6', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <Users size={24} color="#8b5cf6" />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>Unique Codes Generated</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Download the Attendance Excel sheet below to see the specific 6-digit code for each student. Students cannot join without their unique code.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button onClick={handleDownloadCodes} className="btn-primary" style={{ background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.875rem' }}>
                            <Download size={20} /> Download Attendance & Test Codes (Excel)
                        </button>
                        <button onClick={() => navigate('/teacher/exams')} className="btn-secondary" style={{ padding: '0.875rem' }}>
                            Go to Exam Management
                        </button>
                    </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                    <Lock size={14} /> This code is required for student entry to prevent unauthorized home access.
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: 960, margin: '0 auto' }}>

            {/* Page Header */}
            <div style={{ marginBottom: '1.75rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={22} color="#8b5cf6" /> Create New Examination
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Complete all four steps to publish your exam
                </p>
            </div>

            {/* Progress Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
                {STEPS.map((s, i) => {
                    const done   = step > s.id;
                    const active = step === s.id;
                    const Icon   = s.icon;
                    return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div
                                onClick={() => done && setStep(s.id)}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.55rem 0.75rem', borderRadius: '0.75rem',
                                    background: done ? 'rgba(16,185,129,0.1)' : active ? 'rgba(139,92,246,0.12)' : 'var(--card-light)',
                                    border: `2px solid ${done ? '#10b981' : active ? '#8b5cf6' : 'var(--border-light)'}`,
                                    color: done ? '#10b981' : active ? '#8b5cf6' : '#94a3b8',
                                    fontWeight: 700, fontSize: '0.78rem', cursor: done ? 'pointer' : 'default',
                                    transition: 'all 0.3s', whiteSpace: 'nowrap', userSelect: 'none',
                                }}
                            >
                                {done ? <CheckCircle size={14} /> : <Icon size={14} />}
                                <span className="desktop-only">{s.label}</span>
                                <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: '0.68rem' }}>S{s.id}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div style={{ width: 24, height: 2, flexShrink: 0, background: step > s.id ? '#10b981' : 'var(--border-light)', transition: 'background 0.3s' }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── STEP 1: Exam Details ─────────────────────────────────────── */}
            {step === 1 && (
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="card">
                            <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={18} color="#8b5cf6" /> Basic Info
                            </div>
                            <div className="form-group">
                                <label className="label">Exam Title *</label>
                                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="input" placeholder="e.g. Mid-term Physics 2024" />
                            </div>
                            <div className="form-group">
                                <label className="label">Subject *</label>
                                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                    className="input" placeholder="e.g. Quantum Mechanics" list="subjects-list" />
                                <datalist id="subjects-list">{subjects.map(s => <option key={s} value={s} />)}</datalist>
                            </div>
                        </div>
                        <div className="card">
                            <div style={{ fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={18} color="#8b5cf6" /> Configuration
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="label">Duration (mins)</label>
                                    <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: +e.target.value })} className="input" min={5} />
                                </div>
                                <div className="form-group">
                                    <label className="label">Passing Marks (%)</label>
                                    <input type="number" value={form.passingMarks} onChange={e => setForm({ ...form, passingMarks: +e.target.value })} className="input" min={1} max={100} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="label">Exam Date</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input" />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setStep(2)} disabled={!step1Valid} className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6', opacity: step1Valid ? 1 : 0.5 }}>
                            Next: Add Questions <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Bulk Upload + Manual Questions ────────────────────── */}
            {step === 2 && (
                <div>
                    {/* Upload Banner */}
                    <div className="card mb-5" style={{ borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                                    <Upload size={18} /> Bulk Import via Excel
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    Upload an Excel file to import multiple questions at once
                                </p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                                    Columns: QUESTION, OPTION A, OPTION B, OPTION C, OPTION D, ANSWER, SUBJECT, COs, MARKS
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                                <button type="button" onClick={downloadSample} className="btn-secondary"
                                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Download size={14} /> Sample Format
                                </button>
                                <label className="btn-primary"
                                    style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', background: uploading ? '#94a3b8' : '#10b981' }}>
                                    {uploading ? 'Uploading...' : <><Upload size={14} /> Upload Excel</>}
                                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                                </label>
                            </div>
                        </div>
                    </div>

                    {form.questions.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '0.3rem 0.75rem', borderRadius: '99px', fontWeight: 700, fontSize: '0.8rem' }}>
                                {form.questions.length} Question{form.questions.length !== 1 ? 's' : ''} Added
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 mb-4">
                        {form.questions.map((q, qIdx) => (
                            <div key={qIdx} className="card" style={{ borderLeft: '4px solid #8b5cf6', padding: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', background: '#8b5cf6', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>Q{qIdx + 1}</span>
                                    <button type="button" onClick={() => removeQuestion(qIdx)} className="btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Trash2 size={13} /> Remove
                                    </button>
                                </div>
                                <div className="form-group">
                                    <textarea value={q.questionText} onChange={e => updateQ(qIdx, 'questionText', e.target.value)}
                                        placeholder="Enter question text..." className="input" style={{ minHeight: '70px', resize: 'vertical' }} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input type="radio" checked={q.correctAnswer === oIdx} onChange={() => updateQ(qIdx, 'correctAnswer', oIdx)} name={`correct-${qIdx}`} title="Mark as correct answer" />
                                            <input value={opt} onChange={e => updateOpt(qIdx, oIdx, e.target.value)}
                                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`} className="input" style={{ flex: 1 }} />
                                        </div>
                                    ))}
                                </div>
                                <div style={{ textAlign: 'right', marginTop: '0.4rem', fontSize: '0.7rem', color: '#64748b' }}>
                                    ✓ Correct: Option {String.fromCharCode(65 + q.correctAnswer)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="button" onClick={addManualQuestion} className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Plus size={18} /> Add Question Manually
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={18} /> Back
                        </button>
                        <button onClick={() => {
                            if (form.questions.length === 0) return toast.error('Add at least 1 question before proceeding');
                            setStep(3);
                        }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6' }}>
                            Next: Select Students <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Select Students ───────────────────────────────────── */}
            {step === 3 && (
                <div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
                        {/* Header */}
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(139,92,246,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.95rem' }}>
                                <UserCheck size={18} color="#8b5cf6" />
                                Allowed Candidates
                                <span style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', padding: '0.15rem 0.6rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700 }}>
                                    {selectedStudents.length} selected
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {selectedStudents.length > 0 && (
                                    <button type="button" onClick={() => setSelectedStudents([])}
                                        style={{ fontSize: '0.72rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', padding: '0.3rem 0.6rem', cursor: 'pointer', fontWeight: 600 }}>
                                        Clear All
                                    </button>
                                )}
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input className="input" placeholder="Search name, ID, email..." value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ paddingLeft: '2rem', fontSize: '0.8rem', width: 220, borderRadius: '0.5rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Info banner */}
                        <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid var(--border-light)', fontSize: '0.75rem', color: '#64748b' }}>
                            <strong style={{ color: '#10b981' }}>Tip:</strong> If no student is selected, <strong>all students</strong> in your college can take this exam. Select specific students to restrict access.
                        </div>

                        {/* Student List */}
                        <div style={{ padding: '1rem 1.25rem', maxHeight: 480, overflowY: 'auto' }}>
                            {allStudents.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    <Users size={40} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.4 }} />
                                    No students found in your college
                                </div>
                            ) : Object.keys(filtered).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    No students match your search
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {Object.keys(filtered).map(dept => {
                                        const allInDept = Object.values(filtered[dept]).flat();
                                        const allSelected = allInDept.every(s => selectedStudents.includes(s._id));
                                        return (
                                            <div key={dept} style={{ border: '1px solid var(--border-light)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                                {/* Dept row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(139,92,246,0.06)', cursor: 'pointer' }}
                                                    onClick={() => toggleGroup(dept)}>
                                                    <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8b5cf6' }}>
                                                        {expandedGroups[dept] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                    <input type="checkbox" checked={allSelected}
                                                        onChange={e => selectBatch(allInDept, e.target.checked)}
                                                        onClick={e => e.stopPropagation()} />
                                                    <span style={{ fontWeight: 700, fontSize: '0.82rem', flex: 1 }}>{dept}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 600 }}>{allInDept.length} students</span>
                                                </div>

                                                {(expandedGroups[dept] || searchTerm) && (
                                                    <div style={{ padding: '0.5rem 0.75rem' }}>
                                                        {Object.keys(filtered[dept]).map(sem => (
                                                            <div key={sem} style={{ marginBottom: '0.5rem' }}>
                                                                {/* Semester sub-header */}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', paddingLeft: '0.5rem' }}>
                                                                    <input type="checkbox"
                                                                        checked={filtered[dept][sem].every(s => selectedStudents.includes(s._id))}
                                                                        onChange={e => selectBatch(filtered[dept][sem], e.target.checked)} />
                                                                    <span style={{ fontWeight: 700, fontSize: '0.72rem', color: '#10b981' }}>
                                                                        Semester {sem} ({filtered[dept][sem].length})
                                                                    </span>
                                                                </div>
                                                                {/* Individual students */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: '0.2rem', paddingLeft: '1.5rem' }}>
                                                                    {filtered[dept][sem].map(s => (
                                                                        <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '0.35rem',
                                                                            background: selectedStudents.includes(s._id) ? 'rgba(139,92,246,0.07)' : 'transparent',
                                                                            border: `1px solid ${selectedStudents.includes(s._id) ? 'rgba(139,92,246,0.25)' : 'transparent'}` }}>
                                                                            <input type="checkbox"
                                                                                checked={selectedStudents.includes(s._id)}
                                                                                onChange={e => toggleOne(s._id, e.target.checked)} />
                                                                            <div style={{ overflow: 'hidden' }}>
                                                                                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                                                {s.studentId && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{s.studentId}</div>}
                                                                            </div>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected chips */}
                        {selectedStudents.length > 0 && (
                            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-light)', background: 'rgba(139,92,246,0.03)' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem' }}>SELECTED ({selectedStudents.length})</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                    {selectedStudents.slice(0, 20).map(id => {
                                        const s = allStudents.find(x => x._id === id);
                                        return s ? (
                                            <span key={id} style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', padding: '0.15rem 0.5rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                {s.name}
                                                <button type="button" onClick={() => toggleOne(id, false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 0, lineHeight: 1 }}>×</button>
                                            </span>
                                        ) : null;
                                    })}
                                    {selectedStudents.length > 20 && (
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', alignSelf: 'center' }}>
                                            +{selectedStudents.length - 20} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setStep(2)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={18} /> Back
                        </button>
                        <button onClick={() => setStep(4)} className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#8b5cf6' }}>
                            Review & Save <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 4: Review & Save ─────────────────────────────────────── */}
            {step === 4 && (
                <div>
                    {/* Summary */}
                    <div className="card mb-4" style={{ background: 'rgba(139,92,246,0.05)', borderLeft: '4px solid #8b5cf6' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
                            {[
                                { label: 'Exam Title',   value: form.title,           color: '#8b5cf6' },
                                { label: 'Subject',      value: form.subject },
                                { label: 'Duration',     value: `${form.duration} mins` },
                                { label: 'Passing',      value: `${form.passingMarks}%` },
                                { label: 'Questions',    value: form.questions.length, color: '#10b981' },
                                { label: 'Students',     value: selectedStudents.length === 0 ? 'All' : selectedStudents.length, color: selectedStudents.length > 0 ? '#8b5cf6' : '#10b981' },
                            ].map(({ label, value, color }) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                    <div style={{ fontWeight: 800, fontSize: color ? '1.05rem' : '0.95rem', color: color || 'inherit' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Validation Warning */}
                    {hasErrors && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                            <AlertCircle size={16} /> Some questions are incomplete. Go back and fix them before saving.
                        </div>
                    )}

                    {/* Question Review Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                            <ListChecks size={18} color="#8b5cf6" /> Question Review ({form.questions.length})
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 36 }}>#</th>
                                        <th>Question</th>
                                        <th>Options</th>
                                        <th>Correct</th>
                                        <th>Marks</th>
                                        <th style={{ textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.questions.map((q, idx) => {
                                        const incomplete = !q.questionText.trim() || q.options.some(o => !o.trim());
                                        return (
                                            <tr key={idx} style={{ background: incomplete ? 'rgba(239,68,68,0.04)' : undefined }}>
                                                <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{idx + 1}</td>
                                                <td style={{ maxWidth: 280 }}>
                                                    <div style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                        {q.questionText || <span style={{ color: '#ef4444', fontStyle: 'italic' }}>⚠ Missing</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.12rem' }}>
                                                        {q.options.map((opt, oi) => (
                                                            <div key={oi} style={{
                                                                fontSize: '0.7rem', padding: '0.12rem 0.4rem', borderRadius: '3px',
                                                                background: oi === q.correctAnswer ? 'rgba(16,185,129,0.12)' : 'transparent',
                                                                color: oi === q.correctAnswer ? '#10b981' : '#64748b',
                                                                fontWeight: oi === q.correctAnswer ? 700 : 400,
                                                                border: oi === q.correctAnswer ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                                                            }}>
                                                                {String.fromCharCode(65 + oi)}. {opt || <span style={{ color: '#ef4444' }}>empty</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                                                        {String.fromCharCode(65 + q.correctAnswer)}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{q.points}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button type="button" onClick={() => removeQuestion(idx)} className="btn-danger" style={{ padding: '0.25rem 0.5rem' }}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button type="button" onClick={() => setStep(3)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={18} /> Back
                        </button>
                        <button onClick={handleSubmit} disabled={saving || hasErrors || form.questions.length === 0} className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', opacity: (saving || hasErrors) ? 0.6 : 1 }}>
                            <Save size={18} /> {saving ? 'Saving Exam...' : 'Finalize & Publish Exam'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
