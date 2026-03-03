import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { CheckCircle2, XCircle, Clock, Target, Download, RotateCcw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export default function ResultPage() {
    const { attemptId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState({});
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        api.get(`/student/attempts/${attemptId}`)
            .then(({ data }) => setAttempt(data.attempt))
            .catch(() => navigate('/dashboard'))
            .finally(() => setLoading(false));
    }, [attemptId, navigate]);

    const downloadPDF = async () => {
        setDownloading(true);
        try {
            const res = await api.get(`/student/result-pdf/${attemptId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url; link.download = `result-${attemptId}.pdf`;
            document.body.appendChild(link); link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch { } finally { setDownloading(false); }
    };

    const retryWrong = async () => {
        try {
            const { data } = await api.get(`/student/retry-wrong/${attemptId}`);
            if (data.questions.length === 0) { alert('Great job! No wrong answers to retry.'); return; }
            navigate('/practice');
        } catch { }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="spinner" />
        </div>
    );

    if (!attempt) return null;

    const { score, maxScore, accuracy, totalQuestions, correctCount, wrongCount, skippedCount, timeTaken, weakSubjects, answers } = attempt;
    const grade = accuracy >= 85 ? { label: 'Excellent!', color: '#10b981', emoji: '🎉' }
        : accuracy >= 70 ? { label: 'Good Job!', color: '#6366f1', emoji: '👍' }
            : accuracy >= 50 ? { label: 'Average', color: '#f59e0b', emoji: '📚' }
                : { label: 'Needs Work', color: '#ef4444', emoji: '💪' };

    return (
        <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', background: `linear-gradient(135deg, ${grade.color}22, transparent)`, border: `1px solid ${grade.color}44` }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.25rem' }}>{grade.emoji}</div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: grade.color }}>{grade.label}</h1>
                <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                    {attempt.mode === 'exam' ? 'Exam' : 'Practice'} — {attempt.subject || 'Mixed'}
                </p>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, margin: '1rem 0', lineHeight: 1 }}>
                    <span className="gradient-text">{score?.toFixed(1)}</span>
                    <span style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 500 }}>/{maxScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                    <div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: grade.color }}>{accuracy?.toFixed(1)}%</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Accuracy</div></div>
                    <div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06b6d4' }}>{Math.floor(timeTaken / 60)}m {timeTaken % 60}s</div><div style={{ fontSize: '0.75rem', color: '#64748b' }}>Time Taken</div></div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <CheckCircle2 size={24} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{correctCount}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Correct</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <XCircle size={24} color="#ef4444" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{wrongCount}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Wrong</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <Clock size={24} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>{skippedCount}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Skipped</div>
                </div>
            </div>

            {/* Weak Subjects */}
            {weakSubjects?.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚠️ Focus Areas
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {weakSubjects.map((s) => <span key={s} className="badge badge-hard">{s}</span>)}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={downloadPDF} disabled={downloading} style={{ flex: 1, justifyContent: 'center' }}>
                    <Download size={16} /> {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <button className="btn-secondary" onClick={retryWrong} style={{ flex: 1, justifyContent: 'center' }}>
                    <RotateCcw size={16} /> Retry Wrong
                </button>
                <Link to="/dashboard" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                    <Home size={16} /> Dashboard
                </Link>
            </div>

            {/* Question Review */}
            <div className="card">
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Question Review</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {answers?.map((ans, i) => {
                        const q = ans.questionId;
                        if (!q) return null;
                        const isOpen = expanded[i];
                        return (
                            <div key={i} style={{ border: `1px solid ${ans.isCorrect ? 'rgba(16,185,129,0.3)' : ans.selectedOption ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.3)'}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
                                <button onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                                    style={{ width: '100%', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                                        {ans.isCorrect ? <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} /> : ans.selectedOption ? <XCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} /> : <Clock size={18} color="#f59e0b" style={{ flexShrink: 0 }} />}
                                        <span style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            Q{i + 1}. {q.question}
                                        </span>
                                    </div>
                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                {isOpen && (
                                    <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(148,163,184,0.2)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                                            {q.options?.map((opt, j) => {
                                                const letter = ['A', 'B', 'C', 'D'][j];
                                                const isCorrect = letter === ans.correctOption;
                                                const isWrong = letter === ans.selectedOption && !isCorrect;
                                                return (
                                                    <div key={letter} style={{ padding: '0.6rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.875rem', background: isCorrect ? 'rgba(16,185,129,0.12)' : isWrong ? 'rgba(239,68,68,0.12)' : 'transparent', color: isCorrect ? '#059669' : isWrong ? '#dc2626' : 'inherit', fontWeight: isCorrect || isWrong ? 600 : 400, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700 }}>{letter}.</span> {opt}
                                                        {isCorrect && <CheckCircle2 size={14} style={{ marginLeft: 'auto' }} />}
                                                        {isWrong && <XCircle size={14} style={{ marginLeft: 'auto' }} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
