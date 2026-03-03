import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Trophy, Medal, Calendar, TrendingUp } from 'lucide-react';

export default function LeaderboardPage() {
    const [data, setData] = useState([]);
    const [period, setPeriod] = useState('weekly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/student/leaderboard?period=${period}`)
            .then(({ data: d }) => setData(d.leaderboard || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [period]);

    const medals = ['🥇', '🥈', '🥉'];

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>🏆 Leaderboard</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Top performers ranked by score</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['weekly', 'monthly', 'alltime'].map((p) => (
                        <button key={p} onClick={() => setPeriod(p)}
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', border: `2px solid ${period === p ? '#6366f1' : 'var(--border-light)'}`, background: period === p ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: period === p ? '#6366f1' : 'inherit', textTransform: 'capitalize' }}>
                            {p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
            ) : data.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <Trophy size={48} color="#6366f1" style={{ margin: '0 auto 1rem', display: 'block' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No data yet</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Take some exams to appear on the leaderboard!</p>
                </div>
            ) : (
                <>
                    {/* Top 3 podium */}
                    {data.length >= 3 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            {[data[1], data[0], data[2]].map((entry, podiumIdx) => {
                                const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                                const heights = { 1: 160, 2: 120, 3: 100 };
                                return (
                                    <div key={entry._id} style={{ textAlign: 'center', flex: '0 0 auto' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{medals[rank - 1]}</div>
                                        <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{entry.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{entry.avgAccuracy}% acc</div>
                                        <div style={{
                                            height: heights[rank], width: 80, borderRadius: '0.75rem 0.75rem 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '0.75rem', fontWeight: 800, color: 'white', fontSize: '1rem',
                                            background: rank === 1 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : rank === 2 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : 'linear-gradient(135deg, #cd7c2f, #92400e)'
                                        }}>
                                            {entry.totalScore?.toFixed(0)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Full Table */}
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Student</th>
                                    <th>Total Score</th>
                                    <th>Avg Accuracy</th>
                                    <th>Attempts</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((entry, i) => (
                                    <tr key={entry._id} style={{ fontWeight: i < 3 ? 700 : 400 }}>
                                        <td>
                                            {i < 3 ? medals[i] : <span style={{ color: '#94a3b8', fontWeight: 600 }}>#{i + 1}</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                                    {entry.name?.charAt(0).toUpperCase()}
                                                </div>
                                                {entry.name}
                                            </div>
                                        </td>
                                        <td style={{ color: '#6366f1' }}>{entry.totalScore?.toFixed(1)}</td>
                                        <td>
                                            <span style={{ color: entry.avgAccuracy >= 70 ? '#10b981' : entry.avgAccuracy >= 50 ? '#f59e0b' : '#ef4444' }}>
                                                {entry.avgAccuracy}%
                                            </span>
                                        </td>
                                        <td>{entry.totalAttempts}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
