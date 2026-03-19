import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, Shield, ShieldAlert, ChevronLeft, ChevronRight, Send, RotateCcw, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const AUTO_SAVE_INTERVAL = 30000;
const MAX_WARNINGS = 3;
const OPTS = ['A', 'B', 'C', 'D'];

const S = {
    // Layout
    root: { position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#f1f5f9', fontFamily: 'inherit' },
    // Header
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1.25rem', background: 'white', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0, flexWrap: 'wrap', gap: '0.5rem', zIndex: 10 },
    // Sidebar
    sidebar: { width: 76, flexShrink: 0, overflowY: 'auto', padding: '0.75rem 0.4rem', background: 'white', borderRight: '1px solid #e2e8f0' },
    // Main scroll
    main: { flex: 1, overflowY: 'auto', padding: '1.5rem 1.5rem 2rem' },
    // Card
    card: { background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
};

export default function TakeExam() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // Persist testCode in sessionStorage so refresh doesn't break it
    const [storedCode] = useState(() => {
        const code = location.state?.testCode || sessionStorage.getItem(`testCode_${id}`);
        if (code) sessionStorage.setItem(`testCode_${id}`, code);
        return code;
    });

    const [exam, setExam]               = useState(null);
    const [answers, setAnswers]         = useState([]);
    const [timeLeft, setTimeLeft]       = useState(0);
    const [currentQ, setCurrentQ]       = useState(0);
    const [warningCount, setWarningCount] = useState(0);
    const [loading, setLoading]         = useState(true);
    const [submitting, setSubmitting]   = useState(false);
    const [warnModal, setWarnModal]     = useState('');

    const timerRef      = useRef(null);
    const autoSaveRef   = useRef(null);
    const startRef      = useRef(Date.now());
    const submittedRef  = useRef(false);
    const answersRef    = useRef([]);
    const warnCountRef  = useRef(0);
    const timeLeftRef   = useRef(0);

    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { warnCountRef.current = warningCount; }, [warningCount]);
    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // Load
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.post(`/student-exam/exams/${id}/start`, { testCode: storedCode });
                console.log('=== EXAM DATA ===', JSON.stringify(data.exam?.questions?.slice(0,2)));
                setExam(data.exam);
                setTimeLeft(data.progress.timeLeftSeconds);
                setWarningCount(data.progress.warningCount || 0);
                startRef.current = Date.now();
                // Always init answers from question count to ensure correct length
                const qCount = data.exam?.questions?.length || 0;
                if (data.progress.answers?.length === qCount) {
                    setAnswers(data.progress.answers);
                } else {
                    setAnswers(Array.from({ length: qCount }, (_, i) => ({ questionIndex: i, selectedOption: null })));
                }
            } catch (e) {
                toast.error(e.response?.data?.message || 'Failed to start exam');
                navigate('/active-exams');
            } finally { setLoading(false); }
        })();
    }, [id]);

    // Fullscreen
    useEffect(() => {
        if (!exam) return;
        document.documentElement.requestFullscreen?.().catch(() => {});
        return () => document.exitFullscreen?.().catch(() => {});
    }, [exam]);

    // Submit fn (stable ref)
    const doSubmit = useCallback(async (auto = false) => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        clearInterval(timerRef.current);
        clearInterval(autoSaveRef.current);
        try {
            document.exitFullscreen?.().catch(() => {});
            const timeTaken = Math.round((Date.now() - startRef.current) / 1000);
            const { data } = await api.post(`/student-exam/exams/${id}/submit`, { answers: answersRef.current, timeTaken, autoSubmitted: auto });
            toast.success(auto ? 'Auto-submitted!' : 'Exam submitted!');
            navigate(`/result/${data.resultId}`, { replace: true });
        } catch {
            submittedRef.current = false;
            setSubmitting(false);
            toast.error('Submit failed. Try again.');
        }
    }, [id, navigate]);

    // Warning
    const warn = useCallback((msg) => {
        if (submittedRef.current) return;
        const next = warnCountRef.current + 1;
        setWarningCount(next);
        setWarnModal(`⚠️ ${next}/${MAX_WARNINGS}: ${msg}`);
        setTimeout(() => setWarnModal(''), 3500);
        if (next >= MAX_WARNINGS) { toast.error('🚨 Auto-submitting!'); doSubmit(true); }
        else toast.error(msg, { id: 'warn' });
    }, [doSubmit]);

    useEffect(() => {
        if (loading || !exam) return; // Only monitor AFTER exam loads
        
        let isMonitoringActive = false;
        // 5 second grace period for page to load and fullscreen to stabilize
        const graceTimer = setTimeout(() => { isMonitoringActive = true; }, 5000);

        const h = {
            copy: (e) => { if (!isMonitoringActive) return; e.preventDefault(); warn('Copy attempt detected'); },
            ctx:  (e) => { if (!isMonitoringActive) return; e.preventDefault(); warn('Right-click disabled'); },
            key:  (e) => {
                if (!isMonitoringActive) return;
                if ((e.ctrlKey || e.metaKey) && 'cvauip'.includes(e.key.toLowerCase())) { e.preventDefault(); warn('Keyboard shortcut blocked'); }
                if (e.key === 'F12') { e.preventDefault(); warn('DevTools blocked'); }
            },
            vis:  () => { if (!isMonitoringActive) return; if (document.hidden) warn('Tab switch detected'); },
            blur: () => { if (!isMonitoringActive) return; warn('Window lost focus'); },
            fs:   () => { if (!isMonitoringActive) return; if (!document.fullscreenElement) warn('Exited fullscreen'); },
        };
        document.addEventListener('copy', h.copy);
        document.addEventListener('contextmenu', h.ctx);
        document.addEventListener('keydown', h.key);
        document.addEventListener('visibilitychange', h.vis);
        window.addEventListener('blur', h.blur);
        document.addEventListener('fullscreenchange', h.fs);
        return () => {
            clearTimeout(graceTimer);
            document.removeEventListener('copy', h.copy);
            document.removeEventListener('contextmenu', h.ctx);
            document.removeEventListener('keydown', h.key);
            document.removeEventListener('visibilitychange', h.vis);
            window.removeEventListener('blur', h.blur);
            document.removeEventListener('fullscreenchange', h.fs);
        };
    }, [warn]);

    // Timer
    useEffect(() => {
        if (loading || timeLeft <= 0) return;
        timerRef.current = setInterval(() => {
            setTimeLeft(p => {
                if (p <= 1) { clearInterval(timerRef.current); doSubmit(true); return 0; }
                return p - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [loading, doSubmit]);

    // Auto-save
    useEffect(() => {
        if (!exam) return;
        autoSaveRef.current = setInterval(() => {
            api.put(`/student-exam/exams/${id}/save-progress`, { 
                answers: answersRef.current, 
                timeLeftSeconds: timeLeftRef.current, 
                warningCount: warnCountRef.current 
            }).catch(() => {});
        }, AUTO_SAVE_INTERVAL);
        return () => clearInterval(autoSaveRef.current);
    }, [exam, id]);

    const selectAnswer = (qi, letter) => setAnswers(p => p.map(a => a.questionIndex === qi ? { ...a, selectedOption: letter } : a));

    const confirmSubmit = () => {
        const unans = answers.filter(a => !a.selectedOption).length;
        if (unans > 0 && !window.confirm(`${unans} question(s) unanswered. Submit anyway?`)) return;
        doSubmit(false);
    };

    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // ─────────────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f1f5f9' }}>
            <div className="spinner" />
        </div>
    );
    if (!exam) return null;

    const questions = exam.questions || [];
    const q         = questions[currentQ];
    const answered  = answers.filter(a => a.selectedOption).length;
    const urgent    = timeLeft < 300;
    const tColor    = urgent ? '#ef4444' : timeLeft < 600 ? '#f59e0b' : '#10b981';
    const curAns    = answers.find(a => a.questionIndex === currentQ)?.selectedOption;

    return (
        <div style={S.root}>

            {/* Warning Modal */}
            {warnModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}>
                    <div style={{ background: 'white', borderRadius: '1.25rem', padding: '2rem 2.5rem', maxWidth: 380, textAlign: 'center', border: '2px solid #fca5a5', boxShadow: '0 20px 50px rgba(239,68,68,0.25)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <ShieldAlert size={28} color="#ef4444" />
                        </div>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.4rem' }}>{warnModal}</p>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            {warningCount >= MAX_WARNINGS ? 'Auto-submitting your exam...' : `${MAX_WARNINGS - warningCount} violation(s) remaining`}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div style={S.header}>
                {/* Left: title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '0.5rem', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={16} color="#6366f1" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '0.875rem', color: '#1e293b', lineHeight: 1.2 }}>{exam.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{exam.subject} &nbsp;•&nbsp; {answered}/{questions.length} answered</div>
                    </div>
                </div>

                {/* Right: warnings + timer + submit */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Warnings */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <AlertTriangle size={13} color={warningCount > 0 ? '#f59e0b' : '#cbd5e1'} />
                        {[1,2,3].map(n => (
                            <div key={n} style={{ width: 9, height: 9, borderRadius: '50%', background: n <= warningCount ? '#ef4444' : '#e2e8f0', transition: 'background 0.3s' }} />
                        ))}
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: warningCount > 0 ? '#ef4444' : '#94a3b8' }}>{warningCount}/{MAX_WARNINGS}</span>
                    </div>

                    {/* Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '0.625rem', background: urgent ? '#fef2f2' : '#f0fdf4', border: `1.5px solid ${tColor}`, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: tColor }}>
                        <Clock size={13} color={tColor} />
                        {fmt(timeLeft)}
                    </div>

                    {/* Submit */}
                    <button onClick={confirmSubmit} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.875rem', borderRadius: '0.625rem', border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? 0.7 : 1, boxShadow: '0 2px 6px rgba(16,185,129,0.3)', whiteSpace: 'nowrap' }}>
                        <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Exam'}
                    </button>
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Sidebar Navigator */}
                <div style={S.sidebar}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textAlign: 'center', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>NAV</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                        {questions.map((_, i) => {
                            const done = !!answers.find(a => a.questionIndex === i)?.selectedOption;
                            const cur  = i === currentQ;
                            return (
                                <button key={i} onClick={() => setCurrentQ(i)} style={{
                                    width: 28, height: 28, borderRadius: '0.4rem', border: cur ? '2px solid #6366f1' : 'none',
                                    fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                                    background: cur ? '#6366f1' : done ? '#dcfce7' : '#f1f5f9',
                                    color: cur ? 'white' : done ? '#16a34a' : '#64748b',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {[['#6366f1','Current'],['#dcfce7','Done'],['#f1f5f9','Pending']].map(([bg, lbl]) => (
                            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: '#94a3b8' }}>
                                <div style={{ width: 9, height: 9, borderRadius: '2px', background: bg, border: lbl === 'Current' ? '1px solid #6366f1' : 'none' }} />
                                {lbl}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Question Area */}
                <div style={S.main}>
                    {q ? (
                        <div style={{ maxWidth: 780, margin: '0 auto' }}>

                            {/* Question meta */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                                <span style={{ background: '#6366f1', color: 'white', fontWeight: 800, fontSize: '0.75rem', padding: '0.2rem 0.625rem', borderRadius: '0.5rem' }}>Q{currentQ + 1}</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{q.marks || 1} mark{(q.marks || 1) !== 1 ? 's' : ''}</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>{currentQ + 1} / {questions.length}</span>
                            </div>

                            {/* Question Text */}
                            <div style={{ ...S.card, padding: '1.25rem 1.5rem', marginBottom: '1rem', borderLeft: '4px solid #6366f1' }}>
                                <p style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.8, color: '#1e293b', margin: 0 }}>
                                    {q.question}
                                </p>
                            </div>

                            {/* Options */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
                                {(q.options || []).map((opt, oi) => {
                                    const letter   = OPTS[oi];
                                    const selected = curAns === letter;
                                    return (
                                        <button key={oi} onClick={() => selectAnswer(currentQ, letter)} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
                                            borderRadius: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                                            border: `2px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
                                            background: selected ? 'rgba(99,102,241,0.06)' : 'white',
                                            boxShadow: selected ? '0 2px 8px rgba(99,102,241,0.15)' : '0 1px 2px rgba(0,0,0,0.04)',
                                        }}>
                                            {/* Letter badge */}
                                            <span style={{
                                                flexShrink: 0, width: 34, height: 34, borderRadius: '0.5rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, fontSize: '0.82rem',
                                                background: selected ? '#6366f1' : '#f1f5f9',
                                                color: selected ? 'white' : '#64748b',
                                                transition: 'all 0.15s',
                                            }}>{letter}</span>
                                            {/* Option text */}
                                            <span style={{ fontSize: '0.9rem', fontWeight: selected ? 600 : 400, color: '#1e293b', lineHeight: 1.5 }}>
                                                {opt}
                                            </span>
                                            {/* Check icon */}
                                            {selected && (
                                                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                                                    <CheckCircle2 size={18} color="#6366f1" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom Nav */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <button onClick={() => selectAnswer(currentQ, null)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem', padding: '0.35rem 0' }}>
                                    <RotateCcw size={13} /> Clear
                                </button>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: 700, fontSize: '0.8rem', color: currentQ === 0 ? '#cbd5e1' : '#475569', cursor: currentQ === 0 ? 'not-allowed' : 'pointer' }}>
                                        <ChevronLeft size={15} /> Prev
                                    </button>
                                    <button onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))} disabled={currentQ === questions.length - 1}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 1rem', borderRadius: '0.75rem', border: 'none', background: currentQ === questions.length - 1 ? '#e2e8f0' : '#6366f1', color: currentQ === questions.length - 1 ? '#94a3b8' : 'white', fontWeight: 700, fontSize: '0.8rem', cursor: currentQ === questions.length - 1 ? 'not-allowed' : 'pointer' }}>
                                        Next <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No question data available</div>
                    )}
                </div>
            </div>
        </div>
    );
}
