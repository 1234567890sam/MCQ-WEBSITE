import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
    CheckCircle2, XCircle, Clock, Download, Home, ChevronDown, ChevronUp, 
    Lock, BookOpen, BarChart2, Target, Award 
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const OPTS = ['A', 'B', 'C', 'D'];
const COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

export default function ResultPage() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        api.get(`/student-exam/results/${attemptId}`)
            .then(({ data }) => setAttempt(data.result))
            .catch(() => navigate('/my-results'))
            .finally(() => setLoading(false));
    }, [attemptId, navigate]);

    const downloadPDF = async () => {
        setDownloading(true);
        try {
            const res = await api.get(`/student/result-pdf/${attemptId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url; a.download = `result-${attemptId}.pdf`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch { } finally { setDownloading(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="spinner" />
        </div>
    );
    if (!attempt) return null;

    const session = attempt.examSessionId;
    const showResults = !session || session.showResults !== false; // practice mode always show
    const showQA = !session || session.showQA === true;

    // If results not released yet
    if (!showResults) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 600, margin: '4rem auto', textAlign: 'center' }}>
                <div className="card shadow-sm" style={{ padding: '3rem' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <Lock size={32} color="#94a3b8" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Results Not Released</h1>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Your teacher hasn't released the results for <strong>{session?.title}</strong> yet. Check back later.
                    </p>
                    <Link to="/my-results" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Home size={16} /> Back to My Results
                    </Link>
                </div>
            </div>
        );
    }

    const { score, maxScore, accuracy, correctCount, wrongCount, skippedCount, timeTaken, passed, coStats } = attempt;
    const pct = attempt.percentage?.toFixed(1);
    const grade = accuracy >= 85 ? { label: 'Excellent!', color: '#10b981', emoji: '🎉' }
        : accuracy >= 70 ? { label: 'Good Job!', color: '#6366f1', emoji: '👍' }
        : accuracy >= 50 ? { label: 'Average', color: '#f59e0b', emoji: '📚' }
        : { label: 'Needs Work', color: '#ef4444', emoji: '💪' };

    // For QA review — prefer answersWithQuestions (exam mode), fallback to answers (practice mode)
    const qaList = attempt.answersWithQuestions || null;

    return (
        <div className="animate-fade-in" style={{ maxWidth: 850, margin: '0 auto', paddingBottom: '3rem' }}>

            {/* ── Score Card ── */}
            <div className="card shadow-sm" style={{
                marginBottom: '1.5rem', textAlign: 'center',
                background: `linear-gradient(135deg, ${grade.color}10, white)`,
                border: `1px solid ${grade.color}30`
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>{grade.emoji}</div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: grade.color }}>{grade.label}</h1>
                <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                    {session?.title || (attempt.mode === 'exam' ? 'Standard Exam' : 'Practice Mode')} — {session?.subject || attempt.subject || 'All Subjects'}
                </p>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, margin: '1rem 0', lineHeight: 1 }}>
                    <span style={{ color: grade.color }}>{score?.toFixed(1)}</span>
                    <span style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: 500 }}>/{maxScore}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: grade.color }}>{pct}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Accuracy</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Time Taken</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: passed ? '#10b981' : '#ef4444' }}>{passed ? 'Passed' : 'Failed'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* ── Quick Stats ── */}
                <div className="card shadow-sm">
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={18} color="#6366f1" /> Quick Summary
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {[
                            { icon: <CheckCircle2 size={18} color="#10b981" />, val: correctCount, label: 'Correct Answers', color: '#10b981' },
                            { icon: <XCircle size={18} color="#ef4444" />, val: wrongCount, label: 'Incorrect Answers', color: '#ef4444' },
                            { icon: <Clock size={18} color="#f59e0b" />, val: skippedCount, label: 'Questions Skipped', color: '#f59e0b' },
                        ].map(({ icon, val, label, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {icon}
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{label}</span>
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 800, color }}>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Topic Performance Chart ── */}
                <div className="card shadow-sm">
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={18} color="#8b5cf6" /> Topic-wise Performance
                    </h3>
                    {coStats?.length > 0 ? (
                        <div style={{ height: 180 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={coStats} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" fontSize={11} width={80} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={20}>
                                        {coStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                             <p style={{ fontSize: '0.85rem' }}>No topic data available for this session.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={downloadPDF} disabled={downloading} style={{ flex: 1, padding: '0.875rem', fontSize: '0.95rem', justifyContent: 'center' }}>
                    <Download size={18} /> {downloading ? 'Preparing PDF...' : 'Download Certificate / Report'}
                </button>
                <Link to="/my-results" className="btn-secondary" style={{ flex: 1, padding: '0.875rem', fontSize: '0.95rem', justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Home size={18} /> Back to Dashboard
                </Link>
            </div>

            {/* ── Q&A Review ── */}
            {showQA && qaList ? (
                <div className="card shadow-sm">
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={20} color="#6366f1" /> Step-by-Step Question Review
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {qaList.map((ans, i) => {
                            const isOpen = expanded[i];
                            const icon = ans.isCorrect
                                ? <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
                                : ans.selectedOption
                                ? <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                                : <Clock size={18} color="#f59e0b" style={{ flexShrink: 0 }} />;
                            const borderColor = ans.isCorrect ? 'rgba(16,185,129,0.3)' : ans.selectedOption ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.25)';
                            return (
                                <div key={i} style={{ border: `1px solid ${borderColor}`, borderRadius: '1rem', overflow: 'hidden', transition: 'all 0.2s ease' }}>
                                    <button onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}
                                        style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                            {icon}
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                Question {i + 1}: {ans.question}
                                            </span>
                                        </div>
                                        {isOpen ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                                    </button>

                                    {isOpen && (
                                        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(148,163,184,0.1)', background: 'white' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                                                {(ans.options || []).map((opt, j) => {
                                                    const letter = OPTS[j];
                                                    const isCorrect = letter === ans.correctOption;
                                                    const isWrong   = letter === ans.selectedOption && !isCorrect;
                                                    return (
                                                        <div key={letter} style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                            padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem',
                                                            background: isCorrect ? 'rgba(16,185,129,0.08)' : isWrong ? 'rgba(239,68,68,0.08)' : '#f8fafc',
                                                            color: isCorrect ? '#059669' : isWrong ? '#dc2626' : '#475569',
                                                            border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : isWrong ? 'rgba(239,68,68,0.2)' : 'transparent'}`,
                                                            fontWeight: isCorrect || isWrong ? 700 : 500,
                                                        }}>
                                                            <div style={{ width: 24, height: 24, borderRadius: '6px', background: isCorrect ? '#10b981' : isWrong ? '#ef4444' : '#e2e8f0', color: isCorrect || isWrong ? 'white' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                                                {letter}
                                                            </div>
                                                            <span style={{ flex: 1 }}>{opt}</span>
                                                            {isCorrect && <CheckCircle2 size={16} />}
                                                            {isWrong && <XCircle size={16} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {!ans.selectedOption && (
                                                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Clock size={14} /> This question was skipped
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : showQA === false ? (
                <div className="card shadow-sm" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #e2e8f0', background: '#f8fafc' }}>
                    <Lock size={32} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.6 }} />
                    <h4 style={{ fontWeight: 800, color: '#475569', marginBottom: '0.25rem' }}>Question Review Locked</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Teacher has restricted the question review for this exam.</p>
                </div>
            ) : null}
        </div>
    );
}
