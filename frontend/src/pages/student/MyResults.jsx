import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Trophy, Calendar, ChevronRight, Lock, Eye, BookOpen } from 'lucide-react';

export default function MyResults() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/student/my-results')
            .then(({ data }) => setResults(data.results))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

    return (
        <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Exam Results</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>History of your university exam sessions</p>
            </div>

            {results.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <Trophy size={48} color="#94a3b8" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No results yet</div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>You haven't completed any exam sessions yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {results.map((r) => (
                        <div key={r._id} className="card hover-scale" 
                            style={{ cursor: r.resultsReleased ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}
                            onClick={() => r.resultsReleased && navigate(`/session-result/${r.sessionCode}`)}>
                            
                            <div style={{ width: 50, height: 50, borderRadius: '12px', background: r.resultsReleased ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: r.resultsReleased ? '#10b981' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Trophy size={24} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 800, fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sessionTitle}</span>
                                    <span className="badge" style={{ fontSize: '0.65rem' }}>{r.sessionCode}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={14} /> {new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BookOpen size={14} /> {r.subject}</span>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#6366f1' }}>{r.score} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>/{r.maxScore}</span></div>
                                <div style={{ fontSize: '0.75rem', color: r.resultsReleased ? '#10b981' : '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                    {r.resultsReleased ? <><Eye size={12} /> View Details</> : <><Lock size={12} /> Pending</>}
                                </div>
                            </div>

                            {r.resultsReleased && <ChevronRight size={20} color="#94a3b8" style={{ flexShrink: 0 }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
