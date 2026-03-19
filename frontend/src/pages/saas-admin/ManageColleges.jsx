import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, ToggleLeft, ToggleRight, UserPlus, Trash2, Building2, Search, X, Check, Zap, BarChart2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ManageColleges() {
    const navigate = useNavigate();
    const [colleges, setColleges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showAdminForm, setShowAdminForm] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', code: '', email: '', phone: '', address: '' });
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
    const [saving, setSaving] = useState(false);

    const fetchColleges = () => {
        api.get('/saas/colleges')
            .then(r => setColleges(r.data.colleges || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchColleges(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name || !form.code) return toast.error('Name and code required');
        setSaving(true);
        try {
            await api.post('/saas/colleges', form);
            toast.success('College created!');
            setShowCreate(false);
            setForm({ name: '', code: '', email: '', phone: '', address: '' });
            fetchColleges();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const handleCreateAdmin = async (collegeId) => {
        if (!adminForm.name || !adminForm.email || !adminForm.password) return toast.error('Fill all fields');
        try {
            await api.post(`/saas/colleges/${collegeId}/create-admin`, adminForm);
            toast.success('College admin created!');
            setShowAdminForm(null);
            setAdminForm({ name: '', email: '', password: '' });
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const toggleFeature = async (id, feature, current) => {
        try {
            await api.put(`/saas/colleges/${id}/features`, { [feature]: !current });
            toast.success('Feature updated');
            fetchColleges();
        } catch { toast.error('Failed'); }
    };

    const toggleActive = async (id, current) => {
        try {
            await api.put(`/saas/colleges/${id}`, { isActive: !current });
            toast.success(!current ? 'College activated' : 'College deactivated');
            fetchColleges();
        } catch { toast.error('Failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this college? This action cannot be undone.')) return;
        try {
            await api.delete(`/saas/colleges/${id}`);
            toast.success('College deleted');
            fetchColleges();
        } catch { toast.error('Failed'); }
    };

    const filtered = colleges.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Manage Colleges</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Configuration and user management for all institutions</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add College
                </button>
            </div>

            {showCreate && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700 }}>Add New College</h3>
                        <button onClick={() => setShowCreate(false)} className="btn-secondary" style={{ padding: '0.2rem' }}><X size={18} /></button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">College Name *</label>
                            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. MIT Engineering" className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Unique Code *</label>
                            <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. MIT" className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Email</label>
                            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="admin@college.edu" className="input" type="email" />
                        </div>
                        <div className="form-group">
                            <label className="label">Phone</label>
                            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 9876543210" className="input" />
                        </div>
                        <div className="form-group md:col-span-2">
                            <label className="label">Address</label>
                            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full location" className="input" />
                        </div>
                        <div className="md:col-span-2 flex gap-2 pt-2">
                            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Processing...' : 'Create College'}</button>
                            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter colleges by name or code..." className="input" style={{ paddingLeft: '2.5rem' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>College Info</th>
                                <th>Platform Stats</th>
                                <th>Features</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No colleges found</td></tr>
                            ) : filtered.map(c => (
                                <tr key={c._id}>
                                    <td style={{ minWidth: '200px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>CODE: {c.code}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            <div>Students: <b>{c.studentCount}</b></div>
                                            <div>Teachers: <b>{c.teacherCount}</b></div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <button onClick={() => toggleFeature(c._id, 'practiceMode', c.features?.practiceMode)} 
                                                style={{ border: 'none', background: c.features?.practiceMode ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: c.features?.practiceMode ? '#10b981' : '#64748b', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>
                                                Practice: {c.features?.practiceMode ? 'ON' : 'OFF'}
                                            </button>
                                            <button onClick={() => toggleFeature(c._id, 'uploadPermission', c.features?.uploadPermission)}
                                                style={{ border: 'none', background: c.features?.uploadPermission ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: c.features?.uploadPermission ? '#10b981' : '#64748b', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}>
                                                Upload: {c.features?.uploadPermission ? 'ON' : 'OFF'}
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: c.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: c.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                            {c.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => navigate(`/saas/colleges/${c._id}`)} className="btn-secondary" style={{ padding: '0.4rem', color: '#6366f1' }} title="View Analytics"><BarChart2 size={16} /></button>
                                            <button onClick={() => setShowAdminForm(showAdminForm === c._id ? null : c._id)} className="btn-secondary" style={{ padding: '0.4rem' }} title="Create Admin"><UserPlus size={16} /></button>
                                            <button onClick={() => toggleActive(c._id, c.isActive)} className="btn-secondary" style={{ padding: '0.4rem' }}>{c.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}</button>
                                            <button onClick={() => handleDelete(c._id)} className="btn-danger" style={{ padding: '0.4rem' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inline Admin Form */}
            {showAdminForm && (
                <div className="card" style={{ marginTop: '1.5rem', border: '1px solid #3b82f6', background: 'rgba(59,130,246,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700, color: '#2563eb' }}>Create Admin for {colleges.find(col => col._id === showAdminForm)?.name}</h3>
                        <button onClick={() => setShowAdminForm(null)} className="btn-secondary" style={{ padding: '0.2rem' }}><X size={18} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-group">
                            <label className="label">Admin Name</label>
                            <input value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} className="input" />
                        </div>
                        <div className="form-group">
                            <label className="label">Admin Email</label>
                            <input value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} className="input" type="email" />
                        </div>
                        <div className="form-group">
                            <label className="label">Password</label>
                            <input value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} className="input" type="password" />
                        </div>
                        <div className="md:col-span-3">
                            <button onClick={() => handleCreateAdmin(showAdminForm)} className="btn-primary" style={{ background: '#2563eb' }}>Create College Admin</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
