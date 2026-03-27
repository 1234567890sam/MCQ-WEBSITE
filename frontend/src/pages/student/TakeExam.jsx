import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, Shield, ShieldAlert, ChevronLeft, ChevronRight, Send, RotateCcw, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';

const AUTO_SAVE_INTERVAL = 15000;
const MAX_WARNINGS = 3;
const OPTS = ['A', 'B', 'C', 'D'];

// ── Screen-share detection: intercept getDisplayMedia ────────────────────────
let _screenShareWarningFired = false;
const _origGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
if (navigator.mediaDevices && _origGetDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = async (...args) => {
        // We will dispatch a custom event so TakeExam can react
        window.dispatchEvent(new CustomEvent('__antiCheatScreenShare'));
        // Still call original so browser doesn't crash, but immediately stop the stream
        try {
            const stream = await _origGetDisplayMedia(...args);
            stream.getTracks().forEach(t => t.stop());
        } catch { /* denied – fine */ }
        throw new DOMException('Screen capture blocked by exam system.', 'NotAllowedError');
    };
}

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
    const confirm = useConfirm();
    // Persist testCode in sessionStorage so refresh doesn't break it
    const [storedToken] = useState(() => location.state?.rejoinToken || null);
    const [storedCode] = useState(() => {
        const code = location.state?.testCode || sessionStorage.getItem(`testCode_${id}`) || localStorage.getItem(`exam_code_${id}`);
        if (code) {
            sessionStorage.setItem(`testCode_${id}`, code);
            localStorage.setItem(`exam_code_${id}`, code);
        }
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
                const { data } = await api.post(`/student-exam/exams/${id}/start`, {
                    testCode: storedCode,
                    rejoinToken: storedToken
                });
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
            } catch (err) {
                console.error(err);
                const msg = err.response?.data?.message || 'Failed to start exam';
                toast.error(msg);
                if (err.response?.status === 403) {
                    setViolationMsg(msg);
                } else {
                    navigate('/active-exams');
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [id, storedCode, storedToken, navigate]);

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
            localStorage.removeItem(`exam_code_${id}`);
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

    // Flag to suppress blur warning while our own confirm dialog is open
    const suppressBlurRef = useRef(false);

    useEffect(() => {
        if (loading || !exam) return;

        // 4-second grace so fullscreen settles before we start monitoring
        let active = false;
        const graceTimer = setTimeout(() => { active = true; }, 4000);

        // ── helpers ──────────────────────────────────────────────────────────
        const blockAndWarn = (e, msg) => {
            e.preventDefault();
            e.stopPropagation();
            if (active) warn(msg);
        };

        // ── copy / cut / paste / context menu ───────────────────────────────
        const onCopy       = (e) => blockAndWarn(e, 'Copying is not allowed during the exam!');
        const onCut        = (e) => blockAndWarn(e, 'Cutting is not allowed during the exam!');
        const onPaste      = (e) => blockAndWarn(e, 'Pasting is not allowed during the exam!');
        const onCtxMenu    = (e) => { e.preventDefault(); e.stopPropagation(); }; // silent block
        const onSelectStart = (e) => { e.preventDefault(); }; // no text selection

        // ── keyboard shortcuts ───────────────────────────────────────────────
        const onKeyDown = (e) => {
            if (!active) return;
            const ctrl = e.ctrlKey || e.metaKey;

            // Block PrintScreen
            if (e.key === 'PrintScreen' || e.key === 'Print') {
                e.preventDefault();
                // Clear clipboard in case OS already wrote to it
                navigator.clipboard?.writeText('').catch(() => {});
                warn('Screenshot/PrintScreen is not allowed!');
                return;
            }
            // Block F12 / DevTools
            if (e.key === 'F12') { e.preventDefault(); warn('DevTools are blocked!'); return; }
            // Block Ctrl+Shift+I/J/C/K (DevTools)
            if (ctrl && e.shiftKey && ['I','J','C','K'].includes(e.key.toUpperCase())) {
                e.preventDefault(); warn('DevTools shortcut blocked!'); return;
            }
            // Block Ctrl+U (view source)
            if (ctrl && e.key.toUpperCase() === 'U') { e.preventDefault(); warn('View source is blocked!'); return; }
            // Block Ctrl+P (print / screenshot via print)
            if (ctrl && e.key.toUpperCase() === 'P') { e.preventDefault(); warn('Printing/screenshots are blocked!'); return; }
            // Block Ctrl+C/X/V/A
            if (ctrl && ['C','X','V','A'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                if (e.key.toUpperCase() !== 'A') warn('Copy/paste shortcuts are blocked!');
                return;
            }
            // Block Alt+F4 (close window shortcut)
            if (e.altKey && e.key === 'F4') { e.preventDefault(); return; }
            // Block Alt+Tab attempt (can't fully block OS, but preventDefault hurts it)
            if (e.altKey && e.key === 'Tab') { e.preventDefault(); return; }
            // Block Escape (exits fullscreen in some browsers)
            if (e.key === 'Escape') { e.preventDefault(); return; }
        };

        // ── tab switch / visibility ──────────────────────────────────────────
        const onVisChange = () => {
            if (!active) return;
            if (document.hidden) warn('Tab switching detected! Stay on the exam tab.');
        };

        // ── window blur (switching windows/apps) ─────────────────────────────
        const onBlur = () => {
            if (!active || suppressBlurRef.current) return;
            warn('You switched away from the exam window!');
        };

        // ── fullscreen exit + auto re-enter ──────────────────────────────────
        const onFsChange = () => {
            if (!active) return;
            if (!document.fullscreenElement) {
                warn('You exited fullscreen! Returning to fullscreen...');
                setTimeout(() => {
                    document.documentElement.requestFullscreen?.().catch(() => {});
                }, 600);
            }
        };

        // ── browser back/forward (popstate) ─────────────────────────────────
        const onPopState = (e) => {
            // Push state back so the page stays
            window.history.pushState(null, '', window.location.href);
            if (active) warn('Browser navigation is blocked during the exam!');
        };
        // Push an extra history entry so first back press hits our handler
        window.history.pushState(null, '', window.location.href);

        // ── beforeunload (closing tab / refresh) ─────────────────────────────
        const onBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = 'Exam is in progress. Are you sure you want to leave?';
            return e.returnValue;
        };

        // ── screen share detection ───────────────────────────────────────────
        const onScreenShare = () => {
            if (active) warn('Screen sharing is not allowed during the exam!');
        };

        // ── register all listeners ───────────────────────────────────────────
        document.addEventListener('copy',         onCopy,        true);
        document.addEventListener('cut',          onCut,         true);
        document.addEventListener('paste',        onPaste,       true);
        document.addEventListener('contextmenu',  onCtxMenu,     true);
        document.addEventListener('selectstart',  onSelectStart, true);
        document.addEventListener('keydown',      onKeyDown,     true);
        document.addEventListener('visibilitychange', onVisChange);
        window.addEventListener('blur',           onBlur);
        document.addEventListener('fullscreenchange',        onFsChange);
        document.addEventListener('webkitfullscreenchange',  onFsChange);
        window.addEventListener('popstate',       onPopState);
        window.addEventListener('beforeunload',   onBeforeUnload);
        window.addEventListener('__antiCheatScreenShare', onScreenShare);

        return () => {
            clearTimeout(graceTimer);
            document.removeEventListener('copy',         onCopy,        true);
            document.removeEventListener('cut',          onCut,         true);
            document.removeEventListener('paste',        onPaste,       true);
            document.removeEventListener('contextmenu',  onCtxMenu,     true);
            document.removeEventListener('selectstart',  onSelectStart, true);
            document.removeEventListener('keydown',      onKeyDown,     true);
            document.removeEventListener('visibilitychange', onVisChange);
            window.removeEventListener('blur',           onBlur);
            document.removeEventListener('fullscreenchange',       onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            window.removeEventListener('popstate',       onPopState);
            window.removeEventListener('beforeunload',   onBeforeUnload);
            window.removeEventListener('__antiCheatScreenShare', onScreenShare);
        };
    }, [loading, exam, warn]);

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

    const confirmSubmit = async () => {
        const unans = answers.filter(a => !a.selectedOption).length;
        if (unans > 0) {
            suppressBlurRef.current = true;
            let ok = false;
            try {
                ok = await confirm(`${unans} question(s) unanswered. Submit anyway?`, { title: 'Submit Exam?', confirmLabel: 'Submit', variant: 'info' });
            } finally {
                setTimeout(() => { suppressBlurRef.current = false; }, 300);
            }
            if (!ok) return;
        }
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
        <div style={{ ...S.root, userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}>

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
