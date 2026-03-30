import { useEffect, useState } from 'react';
import { Search, Shield, UserCheck, UserX, ChevronLeft, ChevronRight, BarChart2, X, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import DepartmentSelect from '../../components/DepartmentSelect';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ManageTeachers() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', department: '' });
    const [saving, setSaving] = useState(false);

    const fetch = () => {
        setLoading(true);
        api.get('/college-admin/teachers')
            .then(r => setTeachers(r.data.teachers || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };
    
    useEffect(() => { fetch(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return toast.error('Fill required fields');
        setSaving(true);
        try {
            await api.post('/college-admin/teachers', form);
            toast.success('Teacher created');
            setShowForm(false);
            setForm({ name: '', email: '', password: '', department: '' });
            fetch();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/college-admin/teachers/${id}/toggle-active`);
            fetch();
        } catch { toast.error('Update failed'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this teacher?')) return;
        try {
            await api.delete(`/college-admin/teachers/${id}`);
            toast.success('Teacher removed');
            fetch();
        } catch { toast.error('Delete failed'); }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Manage Teachers</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Control staff accounts and departmental assignments</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={18} /> Add Teacher
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700 }}>Add New Teacher</h3>
                        <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '0.2rem' }}><X size={18} /></button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Full Name *</label>
                            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Email *</label>
                            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input" type="email" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Password *</label>
                            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input" type="password" required />
                        </div>
                        <div className="form-group">
                            <DepartmentSelect 
                                value={form.department} 
                                onChange={val => setForm({ ...form, department: val })} 
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-2 pt-2">
                            <button type="submit" disabled={saving} className="btn-primary" style={{ background: '#8b5cf6' }}>{saving ? 'Creating...' : 'Create Teacher'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Teacher Info</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : teachers.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No teachers registered yet</td></tr>
                            ) : teachers.map(t => (
                                <tr key={t._id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.email}</div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b5cf6' }}>{t.department || 'General'}</span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: t.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                            {t.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleToggle(t._id)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                                                {t.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(t._id)} className="btn-danger" style={{ padding: '0.4rem' }}>
                                                <Trash2 size={16} />
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
