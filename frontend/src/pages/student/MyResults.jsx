import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, BookOpen, Clock, CheckCircle2, XCircle, Eye, Lock, Layout, Brain, GraduationCap } from 'lucide-react';
import api from '../../api/axios';

export default function MyResults() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('actual'); // 'actual' | 'test' | 'practice'
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/student-exam/results')
            .then(r => setResults(r.data.results || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredResults = results.filter(r => {
        if (activeTab === 'actual') return r.mode === 'exam' && r.examSessionId;
        if (activeTab === 'test') return r.mode === 'exam' && !r.examSessionId;
        if (activeTab === 'practice') return r.mode === 'practice';
        return false;
    });

    const TabButton = ({ id, label, icon: Icon, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === id ? 'white' : 'transparent',
                color: activeTab === id ? '#6366f1' : '#64748b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: activeTab === id ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
            }}
        >
            <Icon size={16} />
            {label}
            <span style={{
                background: activeTab === id ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.1)',
                color: activeTab === id ? '#6366f1' : '#64748b',
                padding: '0.1rem 0.5rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                marginLeft: '0.25rem'
            }}>
                {count}
            </span>
        </button>
    );

    const actualCount = results.filter(r => r.mode === 'exam' && r.examSessionId).length;
    const testCount = results.filter(r => r.mode === 'exam' && !r.examSessionId).length;
    const practiceCount = results.filter(r => r.mode === 'practice').length;

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trophy size={22} color="#f59e0b" /> My Results
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>View your exam and practice performance history</p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                background: '#f1f5f9',
                padding: '0.375rem',
                borderRadius: '1rem',
                marginBottom: '1.5rem',
                width: 'fit-content'
            }}>
                <TabButton id="actual" label="Actual Exams" icon={GraduationCap} count={actualCount} />
                <TabButton id="test" label="Test Exams" icon={Layout} count={testCount} />
                <TabButton id="practice" label="Practice Results" icon={Brain} count={practiceCount} />
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            ) : filteredResults.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Trophy size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No {activeTab === 'actual' ? 'Actual' : activeTab === 'test' ? 'Test' : 'Practice'} Results Yet</div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {activeTab === 'actual' ? 'Take a faculty-assigned exam' : activeTab === 'test' ? 'Take a standard exam' : 'Try some practice questions'} to see your scores here!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {filteredResults.map(r => {
                        const session = r.examSessionId;
                        // Practice/Standard exams should always show results
                        const resultsReleased = !session || session.showResults;
                        const passed = r.passed;
                        const pct = (r.percentage ?? 0).toFixed(0);
                        const passColor = passed ? '#10b981' : '#ef4444';

                        return (
                            <div key={r._id} className="card" style={{
                                borderLeft: `4px solid ${resultsReleased ? passColor : '#e2e8f0'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                    {/* Exam Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.3rem' }}>
                                            {session?.title || (r.mode === 'practice' ? 'Practice Session' : 'Standard Exam')}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: '#64748b' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <BookOpen size={12} /> {session?.subject || r.subject || 'Mixed'}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Clock size={12} /> {Math.max(1, Math.ceil(r.timeTaken / 60))} min
                                            </span>
                                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Score + Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
                                        {resultsReleased ? (
                                            <>
                                                {/* Score */}
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: passColor, lineHeight: 1 }}>{pct}%</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.score ? r.score.toFixed(1) : 0}/{r.maxScore} marks</div>
                                                </div>

                                                {/* Pass/Fail (only for exams) */}
                                                {r.mode === 'exam' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 700, color: passColor }}>
                                                        {passed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                        {passed ? 'Pass' : 'Fail'}
                                                    </div>
                                                )}

                                                {/* View Result button */}
                                                <button
                                                    onClick={() => navigate(`/result/${r._id}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.45rem 0.875rem', borderRadius: '0.625rem', border: 'none', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                                    <Eye size={14} /> View Result
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, padding: '0.45rem 0.875rem', borderRadius: '0.625rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                <Lock size={13} /> Results Pending
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
