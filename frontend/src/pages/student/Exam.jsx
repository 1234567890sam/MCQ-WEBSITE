import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Clock, PlayCircle, ChevronLeft, ChevronRight, Send, AlertTriangle, Shield, ShieldAlert, KeyRound, ArrowRight } from 'lucide-react';
import useAntiCheat from '../../hooks/useAntiCheat';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ConfirmModal';

export default function ExamPage() {
    const { isExamStudent } = useAuth();
    const { setHideNav } = useOutletContext() || {};
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [subjects, setSubjects] = useState([]);
    const [config, setConfig] = useState({ subject: 'All', count: 70, duration: 30, negativeMarking: false });
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [current, setCurrent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [step, setStep] = useState(isExamStudent ? 'join' : 'config'); // 'config' | 'join' | 'exam'
    const [mode, setMode] = useState('regular'); // 'regular' | 'session'
    const [testCode, setTestCode] = useState('');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [warnings, setWarnings] = useState(0);
    const [violationMsg, setViolationMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const timerRef = useRef(null);
    const questionsRef = useRef([]);
    const answersRef = useRef({});
    const startTimeRef = useRef(null);
    const modeRef = useRef('regular');

    useEffect(() => { questionsRef.current = questions; }, [questions]);
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
    useEffect(() => { modeRef.current = mode; }, [mode]);

    useEffect(() => {
        if (!isExamStudent) {
            api.get('/student/subjects').then(({ data }) => setSubjects(['All', ...data.subjects])).catch(() => { });
        }
        return () => {
            clearInterval(timerRef.current);
            if (setHideNav) setHideNav(false);
        };
    }, [isExamStudent, setHideNav]);

    useEffect(() => {
        if (setHideNav) setHideNav(step === 'exam');
    }, [step, setHideNav]);

    const submitExam = useCallback(async (qs, ans, start) => {
        if (submitting) return;
        setSubmitting(true);
        clearInterval(timerRef.current);
        if (setHideNav) setHideNav(false);
        const timeTaken = Math.round((Date.now() - start) / 1000);

        if (modeRef.current === 'session') {
            const answersArr = qs.map((_, i) => ({
                questionIndex: i,
                selectedOption: ans[qs[i]._id] || null,
            }));
            try {
                const { data } = await api.post(`/student/session-exam/${testCode.toUpperCase()}/submit`, {
                    answers: answersArr, timeTaken
                });
                toast.success('Exam submitted!');
                navigate(`/session-result/${testCode.toUpperCase()}`);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Submit failed');
                setSubmitting(false);
            }
        } else {
            const answersArr = qs.map((q) => ({
                questionId: q._id,
                selectedOption: ans[q._id] || null,
            }));
            try {
                const { data } = await api.post('/student/submit-exam', {
                    answers: answersArr, timeTaken, mode: 'exam',
                    subject: config.subject, negativeMarking: config.negativeMarking,
                });
                toast.success('Exam submitted!');
                navigate(`/result/${data.attemptId}`);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Submit failed');
                setSubmitting(false);
            }
        }
    }, [config.subject, config.negativeMarking, navigate, testCode, submitting]);

    const handleAutoSubmit = useCallback(() => {
        toast.error('🚨 Too many violations! Exam auto-submitted.');
        submitExam(questionsRef.current, answersRef.current, startTimeRef.current);
    }, [submitExam]);

    const handleWarning = useCallback((count, message) => {
        setWarnings(count);
        setViolationMsg(message);
        toast.error(`${message} (${count}/3 warnings)`, { duration: 4000, id: 'anti-cheat-warn' });
        setTimeout(() => setViolationMsg(''), 5000);
    }, []);

    const isExamActive = step === 'exam';
    useAntiCheat({
        enabled: isExamActive,
        maxWarnings: 3,
        onWarning: handleWarning,
        onAutoSubmit: handleAutoSubmit,
    });

    const runTimer = (durationMins, qs, start) => {
        const totalSecs = durationMins * 60;
        setTimeLeft(totalSecs);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    toast.error('⏰ Time is up! Auto-submitting...');
                    submitExam(qs, answersRef.current, start);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startRegularExam = async () => {
        setLoading(true);
        try {
            const params = { count: config.count };
            if (config.subject !== 'All') params.subject = config.subject;
            const { data } = await api.get('/student/practice', { params });
            setQuestions(data.questions);
            setAnswers({});
            setCurrent(0);
            setWarnings(0);
            setViolationMsg('');
            setMode('regular');
            const now = Date.now();
            setStartTime(now);
            setStep('exam');
            runTimer(config.duration, data.questions, now);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load questions');
        } finally { setLoading(false); }
    };

    const joinSessionExam = async (e) => {
        if (e) e.preventDefault();
        if (!testCode) return toast.error('Enter a test code');
        setLoading(true);
        try {
            const { data } = await api.post('/student/join-exam', { code: testCode.trim().toUpperCase() });
            const session = data.session;
            setSessionInfo(session);
            
            // Now fetch questions
            const qRes = await api.get(`/student/session-exam/${session.sessionCode}/questions`);
            setQuestions(qRes.data.questions);
            setAnswers({});
            setCurrent(0);
            setWarnings(0);
            setViolationMsg('');
            setMode('session');
            const now = Date.now();
            setStartTime(now);
            setStep('exam');
            runTimer(session.duration, qRes.data.questions, now);
            toast.success('Exam joined successfully!');
        } catch (err) {
            if (err.response?.status === 409) {
                toast.error('You already submitted this exam');
                navigate(`/session-result/${testCode.toUpperCase()}`);
            } else {
                toast.error(err.response?.data?.message || 'Failed to join exam');
            }
        } finally { setLoading(false); }
    };

    const handleSubmitClick = async () => {
        const unanswered = questions.filter((q) => !answers[q._id]).length;
        if (unanswered > 0) {
            if (!await confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`, { title: 'Submit Exam?', confirmLabel: 'Submit', variant: 'info' })) return;
        }
        submitExam(questions, answers, startTime);
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const activeDuration = mode === 'session' ? sessionInfo?.duration : config.duration;
    const totalSecs = activeDuration * 60;
    const timerPct = totalSecs > 0 ? (timeLeft / totalSecs) * 100 : 0;
    const timerColor = timerPct > 50 ? '#10b981' : timerPct > 25 ? '#f59e0b' : '#ef4444';

    const OPTS = ['A', 'B', 'C', 'D'];
    const q = questions[current];

    // ── Join / Config Step ────────────────────────────────────────────────
    if (step === 'join' || step === 'config') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 650, margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                            {isExamStudent ? 'University Exam Portal' : 'Exam Mode'}
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {isExamStudent ? 'Enter your test code to begin the official exam' : 'Secure timed examination mode'}
                        </p>
                    </div>
                </div>

                {!isExamStudent && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--border-light)', padding: '0.35rem', borderRadius: '0.75rem' }}>
                        <button onClick={() => setStep('config')} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: step === 'config' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: step === 'config' ? '#6366f1' : '#64748b', boxShadow: step === 'config' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                            Standard Exam
                        </button>
                        <button onClick={() => setStep('join')} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none', background: step === 'join' ? 'white' : 'transparent', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: step === 'join' ? '#6366f1' : '#64748b', boxShadow: step === 'join' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                            Join by Test Code
                        </button>
                    </div>
                )}

                {/* Security info banner */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                    <Shield size={18} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        <strong style={{ color: '#6366f1' }}>Secure Exam Mode</strong> — Running in fullscreen.
                        Tab switching, right-click, copy-paste, and developer tools are blocked.
                        <strong style={{ color: '#ef4444' }}> 3 violations</strong> will auto-submit.
                    </div>
                </div>

                {step === 'join' ? (
                    <div className="card shadow-lg" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <KeyRound size={32} />
                        </div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.5rem' }}>Enter Test Code</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Test codes are provided by your university/admin</p>
                        
                        <form onSubmit={joinSessionExam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input className="input" placeholder="e.g. AB12XY" required value={testCode} onChange={e => setTestCode(e.target.value.toUpperCase())}
                                style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem' }} />
                            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }}>
                                {loading ? 'Joining…' : <><ArrowRight size={18} /> Join Exam Session</>}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="card shadow-lg" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
                            <select className="input" value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })}>
                                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>


                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Duration: <span style={{ color: '#6366f1' }}>{config.duration} minutes</span>
                            </label>
                            <input type="range" min={10} max={180} step={10} value={config.duration} onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })} style={{ width: '100%', accentColor: '#6366f1' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem', borderRadius: '0.75rem', border: `2px solid ${config.negativeMarking ? '#ef4444' : 'var(--border-light)'}`, background: config.negativeMarking ? 'rgba(239,68,68,0.06)' : 'transparent', cursor: 'pointer' }}
                            onClick={() => setConfig({ ...config, negativeMarking: !config.negativeMarking })}>
                            <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${config.negativeMarking ? '#ef4444' : '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: config.negativeMarking ? '#ef4444' : 'transparent', flexShrink: 0 }}>
                                {config.negativeMarking && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Negative Marking</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-0.25 marks for wrong answers</div>
                            </div>
                        </div>

                        <button className="btn-primary" onClick={startRegularExam} disabled={loading} style={{ padding: '0.875rem', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                            <PlayCircle size={20} /> {loading ? 'Loading...' : 'Start Standard Exam'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ── Exam Step ────────────────────────────────────────────────────────
    const answered = Object.keys(answers).length;
    return (
        <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>

            {/* Anti-cheat status bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: warnings > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)', border: `1px solid ${warnings > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}`, borderRadius: '0.75rem', padding: '0.6rem 1rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: warnings > 0 ? '#ef4444' : '#10b981' }}>
                    {warnings > 0 ? <ShieldAlert size={16} /> : <Shield size={16} />}
                    {warnings > 0 ? `${warnings}/3 warnings — next violation auto-submits!` : 'Secure Exam Mode Active'}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {[1, 2, 3].map(n => (
                        <div key={n} style={{ width: 12, height: 12, borderRadius: '50%', background: n <= warnings ? '#ef4444' : 'rgba(148,163,184,0.3)', border: `2px solid ${n <= warnings ? '#ef4444' : 'rgba(148,163,184,0.5)'}`, transition: 'all 0.3s' }} />
                    ))}
                </div>
            </div>

            {/* Violation message */}
            {violationMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '0.75rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 600, animation: 'fadeIn 0.3s ease' }}>
                    <ShieldAlert size={18} /> {violationMsg}
                </div>
            )}

            {/* Timer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>{mode === 'session' ? sessionInfo?.title : 'Standard Exam'}</div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Question {current + 1}/{questions.length}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{answered} answered</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: timerPct <= 25 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', padding: '0.4rem 0.875rem', borderRadius: '0.75rem', border: `1px solid ${timerColor}` }}>
                    <Clock size={16} color={timerColor} />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: timerColor, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Timer bar */}
            <div className="timer-bar" style={{ marginBottom: '1.25rem' }}>
                <div className="timer-fill" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
            </div>

            {/* Question card */}
            {q && (
                <div className="card shadow-md" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                        <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{q.marks || 1} mark{q.marks !== 1 ? 's' : ''}</span>
                        {(mode === 'session' ? sessionInfo?.negativeMarking : config.negativeMarking) && <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>-0.25 wrong</span>}
                    </div>

                    <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.7, marginBottom: '1.5rem', pointerEvents: 'none', userSelect: 'none' }}>
                        Q{current + 1}. {q.question}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {q.options.map((opt, i) => {
                            const letter = OPTS[i];
                            const isSelected = answers[q._id] === letter;
                            return (
                                <button key={letter}
                                    className={`option-btn ${isSelected ? 'selected' : ''}`}
                                    onClick={() => setAnswers((prev) => ({ ...prev, [q._id]: letter }))}>
                                    <span style={{
                                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isSelected ? '#6366f1' : 'var(--border-light)', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                                    }}>
                                        {letter}
                                    </span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Navigator */}
            <div className="card shadow-sm" style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', color: '#64748b' }}>Navigator</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {questions.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            style={{
                                width: 36, height: 36, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                                background: i === current ? '#6366f1' : answers[questions[i]._id] ? '#10b981' : 'var(--border-light)',
                                color: i === current || answers[questions[i]._id] ? 'white' : 'inherit'
                            }}>
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} style={{ flex: 1, minWidth: '100px', justifyContent: 'center', opacity: current === 0 ? 0.4 : 1 }}>
                    <ChevronLeft size={18} /> Prev
                </button>
                <button className="btn-secondary" onClick={() => setCurrent(Math.min(questions.length - 1, current + 1))} disabled={current === questions.length - 1} style={{ flex: 1, minWidth: '100px', justifyContent: 'center', opacity: current === questions.length - 1 ? 0.4 : 1 }}>
                    Next <ChevronRight size={18} />
                </button>
                <button onClick={handleSubmitClick} disabled={submitting} style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', opacity: submitting ? 0.7 : 1 }}>
                    <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Exam'}
                </button>
            </div>
        </div>
    );
}
