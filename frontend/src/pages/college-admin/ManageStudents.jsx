import { useEffect, useState } from 'react';
import { Search, Shield, UserCheck, UserX, ChevronLeft, ChevronRight, BarChart2, X, Plus, Upload, Download, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import DepartmentSelect from '../../components/DepartmentSelect';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function ManageStudents() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '', semester: '', department: '' });
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const fetchStudents = (q = '') => {
        setLoading(true);
        api.get(`/college-admin/students?search=${q}`)
            .then(r => setStudents(r.data.students || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchStudents(); }, []);

    const handleSearch = (e) => {
        setSearch(e.target.value);
        fetchStudents(e.target.value);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) return toast.error('Fill required fields');
        setSaving(true);
        try {
            await api.post('/college-admin/students', form);
            toast.success('Student created');
            setShowForm(false);
            setForm({ name: '', email: '', password: '', studentId: '', semester: '', department: '' });
            fetchStudents();
        } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (id) => {
        try {
            await api.patch(`/college-admin/students/${id}/toggle-active`);
            fetchStudents(search);
        } catch { toast.error('Update failed'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this student?')) return;
        try {
            await api.delete(`/college-admin/students/${id}`);
            toast.success('Removed');
            fetchStudents(search);
        } catch { toast.error('Delete failed'); }
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Manage Students</h1>
                    <p style={{ color: '#64748b', fontSize: '0.85rem' }}>View and manage all registered students in your institution</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => navigate('/college-admin/students/bulk')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={18} /> Bulk Upload
                    </button>
                    <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6' }}>
                        <Plus size={18} /> Add Student
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontWeight: 700 }}>Add New Student</h3>
                        <button onClick={() => setShowForm(false)} className="btn-secondary" style={{ padding: '0.2rem' }}><X size={18} /></button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <input value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input" type="password" required />
                        </div>
                        <div className="form-group">
                            <label className="label">Student ID</label>
                            <input value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})} className="input" placeholder="e.g. 21CS042" />
                        </div>
                        <div className="form-group">
                            <label className="label">Semester</label>
                            <input className="input" placeholder="e.g. 4th" value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <DepartmentSelect
                                value={form.department}
                                onChange={val => setForm({ ...form, department: val })}
                            />
                        </div>
                        <div className="md:col-span-3 flex gap-2 pt-2">
                            <button type="submit" disabled={saving} className="btn-primary" style={{ background: '#3b82f6' }}>{saving ? 'Creating...' : 'Create Student'}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input value={search} onChange={handleSearch} placeholder="Search by name, email, or student ID..." className="input" style={{ paddingLeft: '2.5rem' }} />
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>IDs & Department</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" /></td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No students found</td></tr>
                            ) : students.map(s => (
                                <tr key={s._id}>
                                    <td>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.email}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                            ID: <span style={{ fontWeight: 600, color: '#3b82f6' }}>{s.studentId || 'N/A'}</span>
                                            <br />
                                            {s.department || 'General'} {s.semester && `— Sem: ${s.semester}`}
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px', background: s.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: s.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                            {s.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleToggle(s._id)} className="btn-secondary" style={{ padding: '0.4rem' }}>
                                                {s.isActive ? <ToggleRight size={16} color="#10b981" /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(s._id)} className="btn-danger" style={{ padding: '0.4rem' }}>
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
