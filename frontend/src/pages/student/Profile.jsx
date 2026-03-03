import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { User, BookmarkCheck, Trash2, Mail, Calendar, Save } from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [bookmarks, setBookmarks] = useState([]);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('profile');

    useEffect(() => {
        if (tab === 'bookmarks') {
            api.get('/student/bookmarks').then(({ data }) => setBookmarks(data.bookmarks || [])).catch(() => { });
        }
    }, [tab]);

    const handleSave = async () => {
        if (!name.trim()) return toast.error('Name cannot be empty');
        setSaving(true);
        try {
            await api.patch('/student/profile', { name });
            await refreshUser();
            toast.success('Profile updated!');
        } catch { toast.error('Failed to update profile'); }
        finally { setSaving(false); }
    };

    const removeBookmark = async (qId) => {
        try {
            await api.delete(`/student/bookmarks/${qId}`);
            setBookmarks((b) => b.filter((q) => q._id !== qId));
            toast.success('Bookmark removed');
        } catch { }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Profile</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage your account and bookmarks</p>
            </div>

            {/* Avatar card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 800, flexShrink: 0 }}>
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{user?.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Mail size={13} /> {user?.email}</div>
                    <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem', textTransform: 'capitalize' }}>● {user?.role}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[{ id: 'profile', label: 'Edit Profile', icon: User }, { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkCheck }].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setTab(id)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: `2px solid ${tab === id ? '#6366f1' : 'var(--border-light)'}`, background: tab === id ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer', fontWeight: 600, color: tab === id ? '#6366f1' : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        <Icon size={16} /> {label}
                    </button>
                ))}
            </div>

            {tab === 'profile' && (
                <div className="card">
                    <div style={{ fontWeight: 700, marginBottom: '1.5rem' }}>Account Settings</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Full Name</label>
                            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Email Address</label>
                            <input className="input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>Account Role</label>
                            <input className="input" value={user?.role} disabled style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Calendar size={13} /> Member Since
                            </label>
                            <input className="input" value={new Date(user?.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                        </div>
                        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', opacity: saving ? 0.7 : 1 }}>
                            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {tab === 'bookmarks' && (
                <div>
                    {bookmarks.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                            <BookmarkCheck size={40} color="#6366f1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No bookmarks yet</h3>
                            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Bookmark questions during practice to review them here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {bookmarks.map((q) => (
                                <div key={q._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <span className={`badge badge-${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                                            <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{q.subject}</span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.6 }}>{q.question}</p>
                                    </div>
                                    <button onClick={() => removeBookmark(q._id)} className="btn-danger" style={{ padding: '0.4rem', flexShrink: 0, borderRadius: '0.5rem' }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
