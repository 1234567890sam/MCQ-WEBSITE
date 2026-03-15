import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { BookOpen, Filter, Hash, PlayCircle, CheckCircle2, XCircle, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PracticePage() {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [config, setConfig] = useState({ subject: 'All', difficulty: 'All', count: 20 });
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [revealed, setRevealed] = useState({});
    const [step, setStep] = useState('config'); // config | quiz | done
    const [bookmarks, setBookmarks] = useState(new Set());
    const [startTime, setStartTime] = useState(null);

    useEffect(() => {
        api.get('/student/subjects').then(({ data }) => setSubjects(['All', ...data.subjects])).catch(() => { });
        api.get('/auth/me').then(({ data }) => {
            const bIds = data.user?.bookmarks?.map((b) => b._id || b) || [];
            setBookmarks(new Set(bIds));
        }).catch(() => { });
    }, []);

    const startQuiz = async () => {
        try {
            const params = {};
            if (config.subject !== 'All') params.subject = config.subject;
            if (config.difficulty !== 'All') params.difficulty = config.difficulty;
            params.count = config.count;
            const { data } = await api.get('/student/practice', { params });
            setQuestions(data.questions);
            setAnswers({});
            setRevealed({});
            setCurrent(0);
            setStartTime(Date.now());
            setStep('quiz');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load questions');
        }
    };

    const selectOption = (questionId, option) => {
        if (revealed[questionId]) return; // Don't change after reveal
        setAnswers((prev) => ({ ...prev, [questionId]: option }));
    };

    const revealAnswer = (questionId) => {
        setRevealed((prev) => ({ ...prev, [questionId]: true }));
    };

    const toggleBookmark = async (questionId) => {
        try {
            if (bookmarks.has(questionId)) {
                await api.delete(`/student/bookmarks/${questionId}`);
                setBookmarks((prev) => { const s = new Set(prev); s.delete(questionId); return s; });
                toast.success('Bookmark removed');
            } else {
                await api.post(`/student/bookmarks/${questionId}`);
                setBookmarks((prev) => new Set([...prev, questionId]));
                toast.success('Bookmarked!');
            }
        } catch { }
    };

    const submitPractice = async () => {
        const timeTaken = Math.round((Date.now() - startTime) / 1000);
        const answersArr = questions.map((q) => ({
            questionId: q._id,
            selectedOption: answers[q._id] || null,
        }));
        try {
            const { data } = await api.post('/student/submit-exam', {
                answers: answersArr, timeTaken, mode: 'practice', subject: config.subject,
            });
            navigate(`/result/${data.attemptId}`);
        } catch {
            toast.error('Failed to submit');
        }
    };

    const q = questions[current];
    const OPTS = ['A', 'B', 'C', 'D'];

    // ── Config Step ─────────────────────────────────────────────────────── //
    if (step === 'config') {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>Practice Mode</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Configure your practice session</p>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Subject */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subject</label>
                        <select className="input" value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })}>
                            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Difficulty */}
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

                    {/* Count */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Number of Questions: <span style={{ color: '#6366f1' }}>{config.count}</span>
                        </label>
                        {/* Quick picks */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            {[10, 20, 30, 50, 100, 200].map((n) => (
                                <button key={n} onClick={() => setConfig({ ...config, count: n })}
                                    style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: `2px solid ${config.count === n ? '#6366f1' : 'var(--border-light)'}`, background: config.count === n ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: config.count === n ? '#6366f1' : 'inherit' }}>
                                    {n}
                                </button>
                            ))}
                        </div>
                        {/* Custom number */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="number"
                                className="input"
                                min={1}
                                max={1000}
                                value={config.count}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1) setConfig({ ...config, count: Math.min(val, 1000) });
                                }}
                                style={{ maxWidth: '120px' }}
                            />
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>questions (max 1000)</span>
                        </div>
                    </div>

                    <button className="btn-primary" onClick={startQuiz} style={{ padding: '0.875rem', justifyContent: 'center', fontWeight: 700, fontSize: '1rem' }}>
                        <PlayCircle size={20} /> Start Practice
                    </button>
                </div>
            </div>
        );
    }

    // ── Quiz Step ────────────────────────────────────────────────────────── //
    const isRevealed = revealed[q?._id];
    const selectedOpt = answers[q?._id];
    const answered = Object.keys(answers).length;

    return (
        <div className="animate-fade-in" style={{ maxWidth: 850, margin: '0 auto' }}>
            {/* Progress bar */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700 }}>Question {current + 1} of {questions.length}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{answered} answered</span>
                </div>
                <div className="timer-bar">
                    <div className="timer-fill" style={{ width: `${((current + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                </div>
            </div>

            {/* Question card */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                        <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                    </div>
                    <button onClick={() => toggleBookmark(q._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarks.has(q._id) ? '#f59e0b' : '#94a3b8' }}>
                        {bookmarks.has(q._id) ? <BookmarkCheck size={22} /> : <Bookmark size={22} />}
                    </button>
                </div>

                <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.7, marginBottom: '1.5rem' }}>
                    Q{current + 1}. {q.question}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {q.options.map((opt, i) => {
                        const letter = OPTS[i];
                        let cls = 'option-btn';
                        if (isRevealed) {
                            if (letter === q.correctAnswer) cls += ' correct';
                            else if (letter === selectedOpt && selectedOpt !== q.correctAnswer) cls += ' wrong';
                        } else if (selectedOpt === letter) {
                            cls += ' selected';
                        }
                        return (
                            <button key={letter} className={cls} onClick={() => selectOption(q._id, letter)} disabled={isRevealed}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isRevealed && letter === q.correctAnswer ? '#10b981' : isRevealed && letter === selectedOpt ? '#ef4444' : selectedOpt === letter ? '#6366f1' : 'var(--border-light)',
                                    color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                                }}>
                                    {letter}
                                </span>
                                {opt}
                                {isRevealed && letter === q.correctAnswer && <CheckCircle2 size={18} color="#10b981" style={{ marginLeft: 'auto' }} />}
                                {isRevealed && letter === selectedOpt && selectedOpt !== q.correctAnswer && <XCircle size={18} color="#ef4444" style={{ marginLeft: 'auto' }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Reveal button */}
                {selectedOpt && !isRevealed && (
                    <button onClick={() => revealAnswer(q._id)} className="btn-secondary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                        Check Answer
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0} style={{ flex: 1, minWidth: '120px', justifyContent: 'center', opacity: current === 0 ? 0.4 : 1 }}>
                    <ChevronLeft size={18} /> Previous
                </button>
                {current < questions.length - 1 ? (
                    <button className="btn-primary" onClick={() => setCurrent(current + 1)} style={{ flex: 1, minWidth: '120px', justifyContent: 'center' }}>
                        Next <ChevronRight size={18} />
                    </button>
                ) : (
                    <button className="btn-primary" onClick={submitPractice} style={{ flex: 1, minWidth: '140px', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        Submit Results <CheckCircle2 size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}
