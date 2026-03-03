import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Shield, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ManageUsers() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);

    const fetchUsers = async (page = 1) => {
        setLoading(true);
        try {
            const { data } = await api.get('/admin/users', { params: { page, limit: 20, search } });
            setUsers(data.users);
            setPagination({ page: data.pagination.page, total: data.pagination.total, pages: data.pagination.pages });
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(1); }, [search]);

    const toggleRole = async (user) => {
        const newRole = user.role === 'admin' ? 'student' : 'admin';
        if (!window.confirm(`Change ${user.name} to ${newRole}?`)) return;
        try {
            await api.patch(`/admin/users/${user._id}/role`, { role: newRole });
            toast.success('Role updated');
            fetchUsers(pagination.page);
        } catch { toast.error('Failed to update role'); }
    };

    const toggleActive = async (user) => {
        if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`)) return;
        try {
            await api.patch(`/admin/users/${user._id}/toggle`);
            toast.success('Status updated');
            fetchUsers(pagination.page);
        } catch { toast.error('Failed to update status'); }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manage Users</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{pagination.total} total users</p>
                </div>
                <div style={{ position: 'relative', width: 260 }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                    <input className="input" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
            ) : (
                <div className="table-container" style={{ marginBottom: '1.5rem' }}>
                    <table>
                        <thead>
                            <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => (
                                <tr key={u._id}>
                                    <td style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>{(pagination.page - 1) * 20 + i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${u.role === 'admin' ? '#f59e0b, #ef4444' : '#6366f1, #8b5cf6'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                                {u.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{u.email}</td>
                                    <td>
                                        <span className="badge" style={{ background: u.role === 'admin' ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.1)', color: u.role === 'admin' ? '#d97706' : '#6366f1' }}>
                                            {u.role === 'admin' && <Shield size={10} style={{ marginRight: '0.2rem' }} />}
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ background: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#059669' : '#dc2626' }}>
                                            {u.isActive ? '● Active' : '○ Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            <button onClick={() => toggleRole(u)} title="Toggle role" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                                <Shield size={14} />
                                            </button>
                                            <button onClick={() => toggleActive(u)} title="Toggle active" style={{ background: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: u.isActive ? '#ef4444' : '#10b981', border: 'none', padding: '0.35rem', borderRadius: '0.4rem', cursor: 'pointer' }}>
                                                {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No users found</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => fetchUsers(pagination.page - 1)} disabled={pagination.page === 1} style={{ padding: '0.5rem', opacity: pagination.page === 1 ? 0.4 : 1 }}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Page {pagination.page} of {pagination.pages}</span>
                    <button className="btn-secondary" onClick={() => fetchUsers(pagination.page + 1)} disabled={pagination.page === pagination.pages} style={{ padding: '0.5rem', opacity: pagination.page === pagination.pages ? 0.4 : 1 }}><ChevronRight size={16} /></button>
                </div>
            )}
        </div>
    );
}
