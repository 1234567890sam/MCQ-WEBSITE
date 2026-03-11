import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Clock, PlayCircle, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react';

export default function ExamPage() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [config, setConfig] = useState({ subject: 'All', difficulty: 'All', count: 70, duration: 30, negativeMarking: false });
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [current, setCurrent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [step, setStep] = useState('config');
    const [startTime, setStartTime] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        api.get('/student/subjects').then(({ data }) => setSubjects(['All', ...data.subjects])).catch(() => { });
        return () => clearInterval(timerRef.current);
    }, []);

    const submitExam = useCallback(async (qs, ans, start) => {
        clearInterval(timerRef.current);
        const timeTaken = Math.round((Date.now() - start) / 1000);
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
        } catch {
            toast.error('Submit failed. Please try again.');
        }
    }, [config.subject, config.negativeMarking, navigate]);

    const startExam = async () => {
        try {
            const params = { count: config.count };
            if (config.subject !== 'All') params.subject = config.subject;
            if (config.difficulty !== 'All') params.difficulty = config.difficulty;
            const { data } = await api.get('/student/practice', { params });
            setQuestions(data.questions);
            setAnswers({});
            setCurrent(0);
            const now = Date.now();
            setStartTime(now);
            const totalSecs = config.duration * 60;
            setTimeLeft(totalSecs);
            setStep('exam');

            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        toast.error('⏰ Time is up! Auto-submitting...');
                        submitExam(data.questions, {}, now);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load questions');
        }
    };

    const handleSubmitClick = () => {
        const unanswered = questions.filter((q) => !answers[q._id]).length;
        if (unanswered > 0) {
            if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
        }
        submitExam(questions, answers, startTime);
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const totalSecs = config.duration * 60;
    const timerPct = totalSecs > 0 ? (timeLeft / totalSecs) * 100 : 0;
    const timerColor = timerPct > 50 ? '#10b981' : timerPct > 25 ? '#f59e0b' : '#ef4444';

    const OPTS = ['A', 'B', 'C', 'D'];
    const q = questions[current];

    // Config step
    if (step === 'config') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Exam Mode</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Configure your timed exam</p>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
                        <select className="input" value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })}>
                            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Difficulty</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
                                <button key={d} onClick={() => setConfig({ ...config, difficulty: d })}
                                    style={{ padding: '0.75rem', borderRadius: '0.75rem', border: `2px solid ${config.difficulty === d ? '#6366f1' : 'var(--border-light)'}`, background: config.difficulty === d ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: config.difficulty === d ? '#6366f1' : 'inherit' }}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Number of Questions: <span style={{ color: '#6366f1' }}>70</span>
                        </label>
                        <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(99,102,241,0.05)', border: '1px dashed #6366f1', fontSize: '0.85rem', color: '#64748b' }}>
                            Standard exam format: 70 random questions based on your selection.
                        </div>
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

                    <button className="btn-primary" onClick={startExam} style={{ padding: '0.875rem', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                        <PlayCircle size={20} /> Start Exam
                    </button>
                </div>
            </div>
        );
    }

    // Exam step
    const answered = Object.keys(answers).length;
    return (
        <div className="animate-fade-in" style={{ maxWidth: 780, margin: '0 auto' }}>
            {/* Timer header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <span style={{ fontWeight: 700 }}>Question {current + 1}/{questions.length}</span>
                    <span style={{ marginLeft: '1rem', fontSize: '0.85rem', color: '#64748b' }}>{answered} answered</span>
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

            {/* Warning */}
            {timerPct <= 25 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                    <AlertTriangle size={16} /> Less than 25% time remaining!
                </div>
            )}

            {/* Question */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span className={`badge badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                    <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>{q.marks || 1} mark{q.marks !== 1 ? 's' : ''}</span>
                    {config.negativeMarking && <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>-0.25 wrong</span>}
                </div>

                <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.7, marginBottom: '1.5rem' }}>
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

            {/* Question navigator */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.75rem', color: '#64748b' }}>Question Navigator</div>
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
                <button onClick={handleSubmitClick} style={{ flex: 1, minWidth: '140px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}>
                    <Send size={16} /> Submit Exam
                </button>
            </div>
        </div>
    );
}
