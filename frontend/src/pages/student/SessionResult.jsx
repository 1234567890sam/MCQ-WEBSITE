import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, MinusCircle, Clock, Trophy, BookOpen, ArrowLeft, Lock, Download } from 'lucide-react';

export default function SessionResultPage() {
    const { code } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        api.get(`/student/session-exam/${code}/result`)
            .then(({ data: d }) => setData(d))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [code]);

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;
    if (!data) return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Result not found.</div>;

    if (!data.resultsReleased) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
                <Lock size={64} color="#6366f1" style={{ margin: '0 auto 1.5rem', display: 'block', opacity: 0.5 }} />
                <h2 style={{ fontWeight: 800, fontSize: '1.4rem', marginBottom: '0.75rem' }}>Results Not Released Yet</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{data.message}</p>
                {data.summary && (
                    <div className="card" style={{ textAlign: 'left', display: 'inline-flex', flexDirection: 'column', gap: '0.5rem', minWidth: 280, marginBottom: '1.5rem' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Your Submission Summary</div>
                        <div>Score: <strong>{data.summary.score} / {data.summary.maxScore}</strong></div>
                        <div>Accuracy: <strong style={{ color: '#6366f1' }}>{data.summary.accuracy}%</strong></div>
                    </div>
                )}
                <button className="btn-secondary" onClick={() => navigate('/exam')}>Back to Exam</button>
            </div>
        );
    }

    const downloadPDF = async () => {
        if (!data?.attempt?._id) return;
        setDownloading(true);
        try {
            const res = await api.get(`/student/result-pdf/${data.attempt._id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `result-${code.toUpperCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('PDF Downloaded!');
        } catch {
            toast.error('Failed to download PDF');
        } finally {
            setDownloading(false);
        }
    };

    const { attempt, questions, session } = data;
    const OPTS = ['A', 'B', 'C', 'D'];

    return (
        <div className="animate-fade-in" style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button onClick={() => navigate('/exam')} className="btn-secondary" style={{ padding: '0.4rem 0.75rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{session?.title} — Result</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{session?.subject} · Code: {code?.toUpperCase()}</p>
                </div>
                <button 
                    className="btn-primary" 
                    onClick={downloadPDF} 
                    disabled={downloading}
                    style={{ marginLeft: 'auto', padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                >
                    <Download size={16} /> {downloading ? 'Generating...' : 'Download PDF'}
                </button>
            </div>

            {/* Score summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {[
                    { label: 'Score', value: `${attempt.score}/${attempt.maxScore}`, icon: Trophy, color: '#6366f1' },
                    { label: 'Accuracy', value: `${attempt.accuracy}%`, icon: Trophy, color: attempt.accuracy >= 70 ? '#10b981' : attempt.accuracy >= 40 ? '#f59e0b' : '#ef4444' },
                    { label: 'Correct', value: attempt.correctCount, icon: CheckCircle, color: '#10b981' },
                    { label: 'Wrong', value: attempt.wrongCount, icon: XCircle, color: '#ef4444' },
                    { label: 'Skipped', value: attempt.skippedCount, icon: MinusCircle, color: '#94a3b8' },
                    { label: 'Time', value: `${Math.floor(attempt.timeTaken / 60)}m ${attempt.timeTaken % 60}s`, icon: Clock, color: '#f59e0b' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                        <Icon size={22} color={color} style={{ margin: '0 auto 0.4rem', display: 'block' }} />
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color }}>{value}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Question review */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions?.map((q, i) => {
                    const studentAns = attempt.answers?.[i];
                    const studentLetter = studentAns?.selectedOption;
                    const isCorrect = studentAns?.isCorrect;
                    const correctLetter = q.correctAnswer;

                    return (
                        <div key={i} className="card" style={{ borderLeft: `4px solid ${isCorrect ? '#10b981' : studentLetter ? '#ef4444' : '#94a3b8'}` }}>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.82rem', color: isCorrect ? '#10b981' : studentLetter ? '#ef4444' : '#94a3b8' }}>
                                    {isCorrect ? '✓ Correct' : studentLetter ? '✗ Wrong' : '— Skipped'}
                                </span>
                            </div>
                            <p style={{ fontWeight: 600, lineHeight: 1.7, marginBottom: '1rem', fontSize: '0.95rem' }}>Q{i + 1}. {q.question}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {q.options.map((opt, oi) => {
                                    const letter = OPTS[oi];
                                    const isCorrectOpt = letter === correctLetter;
                                    const isStudentOpt = letter === studentLetter;
                                    let bg = 'transparent';
                                    let borderColor = 'var(--border-light)';
                                    let textColor = 'inherit';
                                    if (isCorrectOpt) { bg = 'rgba(16,185,129,0.1)'; borderColor = '#10b981'; textColor = '#059669'; }
                                    else if (isStudentOpt && !isCorrectOpt) { bg = 'rgba(239,68,68,0.1)'; borderColor = '#ef4444'; textColor = '#dc2626'; }

                                    return (
                                        <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: `1.5px solid ${borderColor}`, background: bg, color: textColor, fontSize: '0.9rem' }}>
                                            <span style={{ fontWeight: 700, width: 20, flexShrink: 0 }}>{letter}.</span>
                                            {opt}
                                            {isCorrectOpt && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                                            {isStudentOpt && !isCorrectOpt && <XCircle size={14} color="#ef4444" style={{ marginLeft: 'auto' }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
