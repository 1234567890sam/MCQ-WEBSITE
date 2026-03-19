import { useEffect, useState } from 'react';
import { 
    Trash2, 
    RotateCcw, 
    Building2, 
    Users, 
    FileText, 
    Search, 
    Clock,
    Database,
    Milestone,
    HelpCircle,
    GraduationCap,
    School,
    X
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RecoveryPanel() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('college'); // 'college', 'exam', 'question', 'result'
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTrash = async () => {
        setLoading(true);
        try {
            // Mapping frontend tabs to backend plural trash routes
            let plural = tab === 'college' ? 'colleges' : tab + 's';
            if (tab === 'user') plural = 'users'; // Explicit for users
            
            const { data } = await api.get(`/saas/trash/${plural}`);
            setItems(data[plural] || []);
        } catch (error) {
            toast.error(`Failed to load deleted ${tab}s`);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTrash(); }, [tab]);

    const handleRestore = async (id) => {
        try {
            await api.post(`/saas/recover/${tab}/${id}`);
            toast.success(`${tab.charAt(0).toUpperCase() + tab.slice(1)} restored successfully`);
            fetchTrash();
        } catch (error) {
            toast.error('Restore operation failed');
        }
    };

    const handleDeletePermanently = async (id) => {
        if (!window.confirm(`CRITICAL: Permanently delete this ${tab}? This cannot be undone!`)) return;
        try {
            await api.delete(`/saas/trash/${tab}/${id}`);
            toast.success(`${tab.charAt(0).toUpperCase() + tab.slice(1)} deleted forever`);
            fetchTrash();
        } catch (error) {
            toast.error('Permanent deletion failed');
        }
    };

    const getItemName = (item) => {
        switch (tab) {
            case 'college': return item.name;
            case 'user': return `${item.name} (${item.role})`;
            case 'exam': return item.title;
            case 'question': return item.question;
            case 'result': return `${item.userId?.name || 'N/A'} - ${item.examSessionId?.title || 'Exam'}`;
            default: return 'Unknown Item';
        }
    };

    const getExtraInfo = (item) => {
        switch (tab) {
            case 'college': return `Code: ${item.code}`;
            case 'user': return `Email: ${item.email} | Institution: ${item.collegeId?.name || 'SmartMCQ Global'}`;
            case 'exam': return `Subject: ${item.subject} | Institution: ${item.collegeId?.name || 'N/A'}`;
            case 'question': return `Subject: ${item.subject} | By: ${item.createdBy?.name || 'Staff'}`;
            case 'result': return `Score: ${item.score} | Email: ${item.userId?.email || 'N/A'}`;
            default: return '';
        }
    };

    const filteredItems = items.filter(item => {
        const name = getItemName(item) || "";
        const info = getExtraInfo(item) || "";
        const search = searchTerm.toLowerCase();
        return name.toLowerCase().includes(search) || info.toLowerCase().includes(search);
    });

    const TABS = [
        { id: 'college', label: 'Colleges', icon: School },
        { id: 'user', label: 'Users', icon: Users },
        { id: 'exam', label: 'Exams', icon: FileText },
        { id: 'question', label: 'Questions', icon: HelpCircle },
        { id: 'result', label: 'Results', icon: GraduationCap },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Database color="#6366f1" /> Platform Recovery Engine
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Centrally restore soft-deleted records and institutional data from across the ecosystem.</p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                {TABS.map(t => (
                    <button 
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                            background: tab === t.id ? '#6366f1' : 'transparent', color: tab === t.id ? 'white' : '#64748b', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
                        }}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input className="input" placeholder={`Search in deleted ${tab}s...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Item Details</th>
                                <th>Metadata & Origin</th>
                                <th>Deletion Context</th>
                                <th style={{ textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" /></td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>No {tab}s were found in the graveyard.</td></tr>
                            ) : filteredItems.map(item => (
                                <tr key={item._id}>
                                    <td style={{ maxWidth: '300px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{getItemName(item)}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>ID: {item._id}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>{getExtraInfo(item)}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                                            <Trash2 size={12} /> Deleted At: {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'N/A'}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleRestore(item._id)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', borderColor: '#6366f1' }}>
                                                <RotateCcw size={14} /> RESTORE
                                            </button>
                                            <button onClick={() => handleDeletePermanently(item._id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#fee2e2', color: '#ef4444', border: '1px solid #fee2e2' }}>
                                                <X size={14} /> DELETE FOREVER
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
