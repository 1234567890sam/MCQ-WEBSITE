import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Users, 
    BookOpen, 
    FileText, 
    Download, 
    ChevronLeft,
    TrendingUp,
    GraduationCap,
    School,
    BarChart3,
    Search,
    RotateCcw,
    Trash2,
    CheckCircle,
    Clock,
    ToggleLeft,
    ToggleRight,
    Eye,
    EyeOff,
    FileSpreadsheet
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CollegeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const { data } = await api.get(`/saas/colleges/${id}/stats`);
                setStats(data.stats);
            } else if (activeTab === 'questions') {
                const { data } = await api.get(`/saas/colleges/${id}/questions`);
                setQuestions(data.questions);
            } else if (activeTab === 'exams') {
                const { data } = await api.get(`/saas/colleges/${id}/exams`);
                setExams(data.exams);
            } else if (activeTab === 'results') {
                const { data } = await api.get(`/saas/colleges/${id}/results`);
                setResults(data.results);
            }
        } catch (error) {
            toast.error(`Failed to load ${activeTab}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id, activeTab]);

    const handleRestore = async (type, itemId) => {
        try {
            await api.post(`/saas/recover/${type}/${itemId}`);
            toast.success(`${type} restored`);
            fetchData();
        } catch { toast.error('Restore failed'); }
    };

    const handleDelete = async (type, itemId) => {
        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
        try {
            await api.delete(`/saas/${type}s/${itemId}`);
            toast.success(`${type} deleted`);
            fetchData();
        } catch { toast.error('Delete failed'); }
    };

    const handleToggle = async (type, itemId, field) => {
        try {
            await api.patch(`/saas/exams/${itemId}/toggle-${field}`);
            toast.success('Status updated');
            fetchData();
        } catch { toast.error('Update failed'); }
    };

    const downloadFile = async (url, filename) => {
        try {
            const response = await api.get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch { toast.error('Download failed'); }
    };

    const renderTabContent = () => {
        if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>;

        switch (activeTab) {
            case 'overview': return stats && (
                <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        <StatCard icon={<Users color="#6366f1" />} title="Students" value={stats.counts.students} color="#6366f1" />
                        <StatCard icon={<GraduationCap color="#10b981" />} title="Teachers" value={stats.counts.teachers} color="#10b981" />
                        <StatCard icon={<BookOpen color="#f59e0b" />} title="Exams" value={stats.counts.exams} color="#f59e0b" />
                        <StatCard icon={<TrendingUp color="#ef4444" />} title="Attempts" value={stats.counts.results} color="#ef4444" />
                    </div>
                    <div className="card">
                        <h3 style={{ fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart3 size={18} color="#6366f1" /> Subject Distribution
                        </h3>
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Subject</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
                                <tbody>
                                    {stats.questions.map(q => (
                                        <tr key={q._id}><td>{q._id}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{q.count}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
            case 'questions': return (
                <div className="card animate-fade-in">
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="input" placeholder="Search in question bank..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                        </div>
                        <button className="btn-secondary" onClick={() => downloadFile(`/saas/colleges/${id}/export/questions`, 'Full_Bank.xlsx')}><Download size={16} /> Export XLS</button>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Question</th><th>Subject</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                            <tbody>
                                {questions.filter(q => q.question.toLowerCase().includes(searchTerm.toLowerCase())).map(q => (
                                    <tr key={q._id} style={{ opacity: q.isDeleted ? 0.6 : 1 }}>
                                        <td style={{ maxWidth: '350px' }}>{q.question}</td>
                                        <td><span className="badge">{q.subject}</span></td>
                                        <td>{q.isDeleted ? <span className="badge" style={{ background: '#fee2e2', color: '#ef4444' }}>Deleted</span> : <span className="badge" style={{ background: '#ecfdf5', color: '#10b981' }}>Active</span>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                {q.isDeleted ? 
                                                    <button onClick={() => handleRestore('question', q._id)} className="btn-secondary" style={{ padding: '0.4rem', color: '#6366f1' }} title="Restore"><RotateCcw size={14} /></button> :
                                                    <button onClick={() => handleDelete('question', q._id)} className="btn-danger" style={{ padding: '0.4rem' }} title="Delete"><Trash2 size={14} /></button>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'exams': return (
                <div className="card animate-fade-in">
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Exam Title</th><th>Subject</th><th>Settings</th><th>Status</th><th style={{ textAlign: 'right' }}>Operations</th></tr></thead>
                            <tbody>
                                {exams.map(e => (
                                    <tr key={e._id} style={{ opacity: e.isDeleted ? 0.6 : 1 }}>
                                        <td>
                                            <div style={{ fontWeight: 700 }}>{e.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {e.sessionCode}</div>
                                        </td>
                                        <td><span className="badge">{e.subject}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleToggle('exam', e._id, 'active')} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                                                    {e.isActive ? <ToggleRight size={14} color="#10b981" /> : <ToggleLeft size={14} />} Active
                                                </button>
                                                <button onClick={() => handleToggle('exam', e._id, 'results')} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                                                    {e.showResults ? <Eye size={14} color="#6366f1" /> : <EyeOff size={14} />} Results
                                                </button>
                                            </div>
                                        </td>
                                        <td>{e.isDeleted ? <span className="badge" style={{ background: '#fee2e2', color: '#ef4444' }}>Deleted</span> : <span className="badge" style={{ background: '#ecfdf5', color: '#10b981' }}>Live</span>}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                <button onClick={() => downloadFile(`/saas/exams/${e._id}/export/questions`, `Exam_${e.sessionCode}_Questions.xlsx`)} className="btn-secondary" style={{ padding: '0.4rem', color: '#6366f1' }} title="Download Questions"><FileSpreadsheet size={14} /></button>
                                                <button onClick={() => downloadFile(`/saas/exams/${e._id}/export/results`, `Exam_${e.sessionCode}_Results.xlsx`)} className="btn-secondary" style={{ padding: '0.4rem', color: '#10b981' }} title="Download Results"><Download size={14} /></button>
                                                {e.isDeleted ? 
                                                    <button onClick={() => handleRestore('exam', e._id)} className="btn-secondary" style={{ padding: '0.4rem', color: '#6366f1' }} title="Restore"><RotateCcw size={14} /></button> :
                                                    <button onClick={() => handleDelete('exam', e._id)} className="btn-danger" style={{ padding: '0.4rem' }} title="Delete"><Trash2 size={14} /></button>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'results': return (
                <div className="card animate-fade-in">
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Date</th><th style={{ textAlign: 'right' }}>Status</th></tr></thead>
                            <tbody>
                                {results.map(r => (
                                    <tr key={r._id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{r.userId?.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.userId?.email}</div>
                                        </td>
                                        <td>{r.examSessionId?.title}</td>
                                        <td style={{ fontWeight: 800, color: '#6366f1' }}>{r.score} / {r.totalQuestions}</td>
                                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                                        <td style={{ textAlign: 'right' }}><span className="badge" style={{ background: '#ecfdf5', color: '#10b981' }}>Submitted</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            default: return null;
        }
    };

    return (
        <div style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/saas/colleges')} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '0.5rem' }}><ChevronLeft size={20} /></button>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stats?.college?.name || 'Monitoring Panel'}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Comprehensive institutional oversight and data management</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
                <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<TrendingUp size={16} />} label="Overview" />
                <TabButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={<FileText size={16} />} label="Question Bank" />
                <TabButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon={<BookOpen size={16} />} label="Exams & Ops" />
                <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} icon={<CheckCircle size={16} />} label="Student Results" />
            </div>

            <div style={{ marginBottom: '2rem' }}>{renderTabContent()}</div>

            {activeTab === 'overview' && stats && (
                <div className="card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Global College Exports</h4>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={() => downloadFile(`/saas/colleges/${id}/export/students`, 'Students.xlsx')} className="btn-secondary"><Download size={16} /> Student Roster</button>
                        <button onClick={() => downloadFile(`/saas/colleges/${id}/export/questions`, 'Question_Bank.xlsx')} className="btn-secondary"><Download size={16} /> Full Bank</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon, label }) {
    return (
        <button onClick={onClick} style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
            background: active ? '#6366f1' : 'transparent', color: active ? 'white' : '#64748b', fontWeight: 600, transition: 'all 0.2s'
        }}>{icon} {label}</button>
    );
}

function StatCard({ icon, title, value, color }) {
    return (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem' }}>
            <div style={{ background: `${color}15`, padding: '0.75rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{title}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
            </div>
        </div>
    );
}
