import { useEffect, useState } from 'react';
import { 
    Search, 
    ToggleLeft, 
    ToggleRight, 
    Users, 
    Shield, 
    Building2, 
    Edit, 
    Key, 
    X, 
    Check, 
    UserCircle,
    Mail,
    Filter,
    Save,
    Trash2
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ROLES = [
    { value: '', label: 'All Roles' },
    { value: 'student', label: 'Student' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'college-admin', label: 'College Admin' },
    { value: 'saas-admin', label: 'SaaS Admin' },
];

export default function GlobalUsers() {
    const [users, setUsers] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('');
    
    // Modals
    const [editUser, setEditUser] = useState(null);
    const [resetPwd, setResetPwd] = useState(null);
    const [formData, setFormData] = useState({ name: '', email: '', role: '', collegeId: '' });
    const [newPassword, setNewPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchUsers = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (roleFilter) params.set('role', roleFilter);
        if (collegeFilter) params.set('collegeId', collegeFilter);
        
        api.get(`/saas/users?${params}`)
            .then(r => setUsers(r.data.users || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    const fetchColleges = () => {
        api.get('/saas/colleges').then(r => setColleges(r.data.colleges || []));
    };

    useEffect(() => { 
        fetchUsers(); 
        fetchColleges();
    }, [roleFilter, collegeFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers();
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/saas/users/${id}/toggle-active`);
            fetchUsers();
            toast.success('Status updated');
        } catch { toast.error('Failed'); }
    };

    const startEdit = (u) => {
        setEditUser(u._id);
        setFormData({
            name: u.name,
            email: u.email,
            role: u.role,
            collegeId: u.collegeId?._id || ''
        });
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await api.patch(`/saas/users/${editUser}`, formData);
            toast.success('User updated');
            setEditUser(null);
            fetchUsers();
        } catch (e) { toast.error(e.response?.data?.message || 'Update failed'); }
        finally { setSaving(false); }
    };

    const handleResetPassword = async () => {
        if (!newPassword) return toast.error('Enter new password');
        setSaving(true);
        try {
            await api.post(`/saas/users/${resetPwd}/reset-password`, { password: newPassword });
            toast.success('Password updated');
            setResetPwd(null);
            setNewPassword('');
        } catch { toast.error('Reset failed'); }
        finally { setSaving(false); }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to move ${user.name} to trash?`)) return;
        try {
            await api.delete(`/saas/users/${user._id}`);
            toast.success('User moved to trash');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Move this user to trash?')) return;
        try {
            await api.delete(`/saas/users/${id}`);
            toast.success('User moved to trash');
            fetchUsers();
        } catch { toast.error('Delete failed'); }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Global User Management</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Advanced administrative control across all institutions</p>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>SEARCH USERS</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email..." className="input" style={{ paddingLeft: '2.5rem' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>ROLE</label>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input" style={{ width: '160px' }}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', display: 'block' }}>COLLEGE</label>
                        <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)} className="input" style={{ width: '200px' }}>
                            <option value="">All Institutions</option>
                            {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: '42px' }}>Apply</button>
                </form>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User Identity</th>
                                <th>Institutional Affiliation</th>
                                <th>Role & Status</th>
                                <th style={{ textAlign: 'right' }}>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No users found for selected filters</td></tr>
                            ) : users.map(u => (
                                <tr key={u._id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '50%' }}><UserCircle size={20} color="#64748b" /></div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={12} /> {u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{u.collegeId?.name || 'SmartMCQ Global'}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>CODE: {u.collegeId?.code || 'SaaS'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span className="badge" style={{ background: u.role === 'saas-admin' ? '#fef3c7' : '#e0f2fe', color: u.role === 'saas-admin' ? '#92400e' : '#0369a1', textTransform: 'uppercase' }}>{u.role}</span>
                                            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '99px', background: u.isActive ? '#ecfdf5' : '#fee2e2', color: u.isActive ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                                                {u.isActive ? 'ACTIVE' : 'DISABLED'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => startEdit(u)} className="btn-secondary" style={{ padding: '0.4rem' }} title="Edit User"><Edit size={14} /></button>
                                            <button onClick={() => setResetPwd(u._id)} className="btn-secondary" style={{ padding: '0.4rem' }} title="Reset Password"><Key size={14} /></button>
                                            {u.role !== 'saas-admin' && (
                                                <>
                                                    <button onClick={() => handleToggle(u._id)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                                                        {u.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(u)} className="btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }} title="Delete User">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editUser && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontWeight: 800 }}>Edit User Details</h3>
                            <button onClick={() => setEditUser(null)} className="btn-secondary" style={{ padding: '0.4rem' }}><X size={18} /></button>
                        </div>
                        <div className="grid gap-4">
                            <div className="form-group">
                                <label className="label">Full Name</label>
                                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" />
                            </div>
                            <div className="form-group">
                                <label className="label">Email Address</label>
                                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input" type="email" />
                            </div>
                            <div className="form-group">
                                <label className="label">System Role</label>
                                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input">
                                    {ROLES.filter(r => r.value).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="label">Institution</label>
                                <select value={formData.collegeId} onChange={e => setFormData({...formData, collegeId: e.target.value})} className="input">
                                    <option value="">No Affiliation (Global)</option>
                                    {colleges.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                            <button onClick={handleUpdate} disabled={saving} className="btn-primary" style={{ flex: 1 }}><Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}</button>
                            <button onClick={() => setEditUser(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {resetPwd && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontWeight: 800 }}>Reset Password</h3>
                            <button onClick={() => setResetPwd(null)} className="btn-secondary" style={{ padding: '0.4rem' }}><X size={18} /></button>
                        </div>
                        <div className="form-group">
                            <label className="label">New Secure Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" placeholder="Min 6 characters" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                            <button onClick={handleResetPassword} disabled={saving} className="btn-primary" style={{ flex: 1 }}><Check size={16} /> {saving ? 'Updating...' : 'Update Password'}</button>
                            <button onClick={() => setResetPwd(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
