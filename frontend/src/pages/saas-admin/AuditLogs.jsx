import { useEffect, useState } from 'react';
import { 
    Activity, 
    Search, 
    User, 
    Calendar, 
    Shield, 
    ChevronLeft, 
    ChevronRight, 
    Filter,
    Clock,
    Tag,
    Info,
    LayoutDashboard
} from 'lucide-react';
import api from '../../api/axios';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'TOGGLE', 'EXPORT', 'LOGIN'];
const MODELS = ['College', 'User', 'Question', 'ExamSession', 'Attempt'];

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', action: '', targetModel: '' });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ ...filters, page, limit: 15 });
            const { data } = await api.get(`/saas/audit-logs?${params}`);
            setLogs(data.logs || []);
            setTotal(data.pagination?.total || 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, [page, filters.action, filters.targetModel]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return '#10b981';
            case 'DELETE': return '#ef4444';
            case 'UPDATE': return '#3b82f6';
            case 'RESTORE': return '#8b5cf6';
            default: return '#64748b';
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Shield color="#6366f1" /> Platform Audit Trail
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Comprehensive logging of all administrative and critical system actions.</p>
                </div>
                <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                    TOTAL EVENTS: {total}
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <label className="label">Search Details</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input className="input" style={{ paddingLeft: '2.5rem' }} placeholder="Search log entries..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="label">Action Type</label>
                        <select className="input" value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})}>
                            <option value="">All Actions</option>
                            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Entity Type</label>
                        <select className="input" value={filters.targetModel} onChange={e => setFilters({...filters, targetModel: e.target.value})}>
                            <option value="">All Entities</option>
                            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn-primary">Filter</button>
                </form>
            </div>

            {/* Logs Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Actor</th>
                                <th>Action & Entity</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}><div className="spinner" /></td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>No audit logs found.</td></tr>
                            ) : logs.map(log => (
                                <tr key={log._id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12} /> {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ background: '#f1f5f9', padding: '0.4rem', borderRadius: '50%' }}><User size={14} color="#64748b" /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{log.userId?.name || 'Deleted User'}</div>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{log.userId?.role?.toUpperCase() || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: getActionColor(log.action), border: `1px solid ${getActionColor(log.action)}`, padding: '0.1rem 0.4rem', borderRadius: '4px', width: 'fit-content' }}>
                                                {log.action}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <Tag size={12} /> {log.targetModel}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ minWidth: '250px' }}>
                                        <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.4 }}>{log.details}</div>
                                        {log.targetId && (
                                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>ID: {log.targetId}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: '#f8fafc' }}>
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary" style={{ padding: '0.4rem' }}><ChevronLeft size={18} /></button>
                    <div style={{ display: 'flex', alignItems: 'center', px: '1rem', fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>
                        PAGE {page} OF {Math.ceil(total / 15) || 1}
                    </div>
                    <button disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)} className="btn-secondary" style={{ padding: '0.4rem' }}><ChevronRight size={18} /></button>
                </div>
            </div>
        </div>
    );
}
