import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Play, RotateCcw, CheckCircle, KeyRound, Users } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ActiveExams() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const [showCodeModal, setShowCodeModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [testCode, setTestCode] = useState('');

    useEffect(() => {
        api.get('/student-exam/exams/active')
            .then(r => setExams(r.data.exams || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleStartClick = (exam) => {
        setSelectedExam(exam);
        setTestCode('');
        setShowCodeModal(true);
    };

    const handleConfirmStart = () => {
        if (!testCode.trim()) return toast.error('Please enter the test code');
        setShowCodeModal(false);
        navigate(`/take-exam/${selectedExam._id}`, { state: { testCode: testCode.trim() } });
    };

    return (
        <div className="animate-fade-in" style={{ position: 'relative' }}>
            {/* Test Code Modal */}
            {showCodeModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
                    <div className="card" style={{ maxWidth: 400, width: '100%', padding: '2rem', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                            <KeyRound size={24} color="#6366f1" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Enter Test Code</h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Please enter the 6-digit code provided by your teacher to start <strong>{selectedExam?.title}</strong>.
                        </p>
                        <input
                            type="text"
                            value={testCode}
                            onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                            placeholder="e.g. 123456"
                            maxLength={10}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '2px solid #e2e8f0', textAlign: 'center', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.2em', marginBottom: '1.5rem', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setShowCodeModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleConfirmStart} className="btn-primary" style={{ flex: 1, background: '#6366f1' }}>Verify & Start</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <KeyRound size={22} color="#10b981" /> Active Exams
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    Exams currently available for you to take
                </p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                </div>
            ) : exams.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <BookOpen size={48} color="#94a3b8" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.5 }} />
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Active Exams</div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        No exams are available for you right now. Check back later.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {exams.map((exam) => (
                        <div
                            key={exam._id}
                            className="card"
                            style={{
                                borderLeft: `4px solid ${exam.alreadySubmitted ? '#10b981' : exam.canResume ? '#f59e0b' : '#6366f1'}`,
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                {/* Exam Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem' }}>
                                        {exam.title}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <BookOpen size={13} /> {exam.subject}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Clock size={13} /> {exam.duration} min
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Users size={13} /> {exam.questions?.length || '?'} questions
                                        </span>
                                    </div>

                                    {/* Session code badge if available */}
                                    {exam.sessionCode && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <span style={{
                                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                                padding: '0.15rem 0.6rem', borderRadius: '99px',
                                                fontFamily: 'monospace', fontWeight: 800, fontSize: '0.78rem',
                                                letterSpacing: '0.08em', border: '1px dashed #10b981'
                                            }}>
                                                {exam.sessionCode}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Button */}
                                <div style={{ flexShrink: 0 }}>
                                    {exam.alreadySubmitted ? (
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            fontSize: '0.82rem', fontWeight: 700, color: '#10b981',
                                            background: 'rgba(16,185,129,0.1)', padding: '0.55rem 1rem',
                                            borderRadius: '0.75rem', border: '1px solid rgba(16,185,129,0.25)'
                                        }}>
                                            <CheckCircle size={16} /> Submitted
                                        </span>
                                    ) : exam.canResume ? (
                                        <button
                                            onClick={() => handleStartClick(exam)}
                                            className="btn-primary"
                                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <RotateCcw size={16} /> Resume Exam
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStartClick(exam)}
                                            className="btn-primary"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Play size={16} /> Start Exam
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
