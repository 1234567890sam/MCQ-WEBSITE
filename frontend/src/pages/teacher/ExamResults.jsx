import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trophy, CheckCircle, XCircle, Clock, Save, Eye, X } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ExamResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState([]);
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAttempt, setSelectedAttempt] = useState(null);
    const [attemptQuestions, setAttemptQuestions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        Promise.all([api.get(`/teacher/exams/${id}`), api.get(`/teacher/exams/${id}/results`)])
            .then(([examRes, resultsRes]) => {
                setExam(examRes.data.exam);
                setResults(resultsRes.data.results);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    const handleExport = async (format) => {
        try {
            const r = await api.get(`/teacher/exams/${id}/export?format=${format}`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${exam?.title}_results_${format === 'marksheet' ? 'format' : 'sheet'}.${format === 'pdf' ? 'pdf' : (format === 'csv' ? 'csv' : 'xlsx')}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success(`Exported as ${format.toUpperCase()}`);
        } catch { toast.error('Export failed'); }
    };

    const openModal = async (attemptId) => {
        setModalLoading(true);
        setShowModal(true);
        try {
            const res = await api.get(`/teacher/attempts/${attemptId}`);
            setSelectedAttempt(res.data.attempt);
            setAttemptQuestions(res.data.questions);
        } catch { 
            toast.error('Failed to load details'); 
            setShowModal(false); 
        } finally { setModalLoading(false); }
    };

    const toggleCorrectness = async (idx) => {
        if (!selectedAttempt) return;
        const newStatus = !selectedAttempt.answers[idx].isCorrect;
        try {
            const res = await api.patch(`/teacher/attempts/${selectedAttempt._id}/answers/${idx}`, { isCorrect: newStatus });
            setSelectedAttempt(res.data.attempt);
            // Update the results list in background
            setResults(prev => prev.map(r => r._id === selectedAttempt._id ? { ...r, ...res.data.attempt } : r));
            toast.success('Status updated');
        } catch { toast.error('Update failed'); }
    };

    const updateCorrectOption = async (idx, letter) => {
        if (!selectedAttempt) return;
        try {
            const res = await api.patch(`/teacher/attempts/${selectedAttempt._id}/answers/${idx}`, { correctOption: letter });
            setSelectedAttempt(res.data.attempt);
            setResults(prev => prev.map(r => r._id === selectedAttempt._id ? { ...r, ...res.data.attempt } : r));
            toast.success(`Correct answer changed to ${letter}`);
        } catch { toast.error('Update failed'); }
    };

    const passCount = results.filter(r => r.passed).length;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Exam Results</h1>
                        {exam && <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{exam.title} — {results.length} submissions</p>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleExport('marksheet')} className="btn-primary" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#0891b2' }}>
                        <Download size={14} /> DOWNLOAD FORMAT
                    </button>
                    {['excel', 'pdf'].map(fmt => (
                        <button key={fmt} onClick={() => handleExport(fmt)} className="btn-secondary" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Download size={14} /> {fmt.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {results.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{results.length}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PASSED</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{passCount}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>FAILED</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{results.length - passCount}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PASS RATE</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Student</th>
                                <th>Score</th>
                                <th>Result</th>
                                <th>Correct</th>
                                 <th>Time</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No submissions found</td></tr>
                            ) : results.map((r, i) => (
                                <tr key={r._id}>
                                    <td>
                                        {i === 0 ? <Trophy size={16} color="#f59e0b" /> : <span style={{ color: '#64748b' }}>{i + 1}</span>}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.userId?.name || 'N/A'}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.userId?.studentId}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{r.percentage?.toFixed(1)}%</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.score}/{r.maxScore}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', background: r.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.passed ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                            {r.passed ? 'PASS' : 'FAIL'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem' }}>
                                            <span style={{ color: '#10b981' }}>{r.correctCount}C</span> • <span style={{ color: '#ef4444' }}>{r.wrongCount}W</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {Math.round(r.timeTaken / 60)}m
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        {new Date(r.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => openModal(r._id)} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                                            <Eye size={12} /> See Q&A
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'sticky', top: 0, background: 'white', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Student Q&A Review</h2>
                                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedAttempt?.userId?.name} — {selectedAttempt?.score}/{selectedAttempt?.maxScore} Marks</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem', borderRadius: '0.5rem', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {modalLoading ? (
                                <div style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {selectedAttempt?.answers.map((ans, idx) => {
                                        const qText = attemptQuestions[idx]?.question || 'Question text not found';
                                        const options = attemptQuestions[idx]?.options || [];
                                        return (
                                            <div key={idx} style={{ padding: '1rem', borderRadius: '1rem', background: '#f8fafc', border: `1px solid ${ans.isCorrect ? '#10b98130' : '#ef444430'}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Q{idx + 1}. {qText}</span>
                                                    <button 
                                                        onClick={() => toggleCorrectness(idx)}
                                                        style={{ flexShrink: 0, padding: '0.2rem 0.6rem', height: 'fit-content', fontSize: '0.65rem', borderRadius: '2rem', border: 'none', background: ans.isCorrect ? '#10b981' : '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                                                    >
                                                        {ans.isCorrect ? 'Marked Correct' : 'Marked Wrong'}
                                                    </button>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    {options.map((opt, i) => {
                                                        const letter = ['A', 'B', 'C', 'D'][i];
                                                        const isSelected = ans.selectedOption === letter;
                                                        const isCorrect = ans.correctOption === letter;
                                                        return (
                                                            <div key={i} style={{ fontSize: '0.75rem', padding: '0.6rem', borderRadius: '0.6rem', background: isCorrect ? '#10b98115' : isSelected ? '#ef444415' : 'white', border: `1px solid ${isCorrect ? '#10b98140' : isSelected ? '#ef444440' : '#e2e8f0'}`, color: isCorrect ? '#059669' : isSelected ? '#dc2626' : '#64748b', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                    <span style={{ fontWeight: 700 }}>{letter}. <span style={{ fontWeight: 500 }}>{opt}</span></span>
                                                                    {!isCorrect && (
                                                                        <button 
                                                                            onClick={() => updateCorrectOption(idx, letter)}
                                                                            style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer', opacity: 0.7 }}
                                                                        >
                                                                            Set Correct
                                                                        </button>
                                                                    )}
                                                                    {isCorrect && <CheckCircle size={12} />}
                                                                </div>
                                                                {isSelected && <span style={{ fontSize: '0.6rem', fontWeight: 700, fontStyle: 'italic' }}>Student Choice</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', display: 'flex', gap: '1rem' }}>
                                                    <span style={{ color: '#64748b' }}>Student Choice: <strong style={{ color: ans.isCorrect ? '#10b981' : '#ef4444' }}>{ans.selectedOption || 'Skipped'}</strong></span>
                                                    <span style={{ color: '#64748b' }}>Correct Ans: <strong style={{ color: '#10b981' }}>{ans.correctOption}</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
