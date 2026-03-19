import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart2, PlusCircle, TrendingUp, CheckCircle, LayoutDashboard } from 'lucide-react';
import api from '../../api/axios';

export default function TeacherDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/teacher/dashboard')
            .then(r => setStats(r.data.dashboard))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const cards = [
        { label: 'Total Exams', value: stats?.totalExams ?? 0, icon: BookOpen, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Active Exams', value: stats?.activeExams ?? 0, icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Students Tested', value: stats?.totalStudentsTested ?? 0, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Pass Rate', value: `${stats?.overallPassRate ?? 0}%`, icon: CheckCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Teacher Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Welcome back! Here's an overview of your academic performance.</p>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                {cards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="stat-card" style={{ cursor: 'default' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                            </div>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon size={22} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card" onClick={() => navigate('/teacher/exams/create')} style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <PlusCircle size={30} color="#8b5cf6" />
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Create New Exam</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Instantly build a new examination with custom questions and settings</p>
                </div>

                <div className="card" onClick={() => navigate('/teacher/exams')} style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '2rem', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                        <BookOpen size={30} color="#10b981" />
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>View All Exams</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Manage your existing exams, assign students, and track results</p>
                </div>
            </div>
        </div>
    );
}
