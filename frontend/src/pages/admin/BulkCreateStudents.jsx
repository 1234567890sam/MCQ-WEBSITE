import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Upload, Users, Download, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function BulkCreateStudents() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select an Excel file');
        setLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await api.post('/admin/bulk-create-students', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(data);
            toast.success(data.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const downloadCredentials = () => {
        if (!result?.credentialsBase64) return;
        const bytes = Uint8Array.from(atob(result.credentialsBase64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'student_credentials.xlsx'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bulk Create Students</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Upload an Excel file to create exam-only student accounts in bulk</p>
            </div>

            {/* Format info */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={18} color="#6366f1" /> Required Excel Format
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                    {[
                        { col: 'NAME', desc: 'Full name (required)' },
                        { col: 'STUDENT ID', desc: 'Unique enrollment ID (required)' },
                        { col: 'EMAIL', desc: 'Login email (optional)' },
                        { col: 'DEPARTMENT', desc: 'e.g. Computer Science' },
                        { col: 'SEMESTER', desc: 'e.g. 6' },
                        { col: 'SEAT NUMBER', desc: 'Exam seat no. (optional)' },
                    ].map(({ col, desc }) => (
                        <div key={col} style={{ padding: '0.4rem 0.6rem', background: 'white', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                            <code style={{ color: '#6366f1', fontWeight: 700, fontSize: '0.75rem' }}>{col}</code>
                            <div style={{ color: '#64748b', fontSize: '0.65rem' }}>{desc}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>💡 Passwords are automatically set same as the **STUDENT ID**.</div>
                    <button onClick={() => window.open(`${api.defaults.baseURL}/admin/download-sample/students?token=${localStorage.getItem('accessToken')}`, '_blank')}
                        style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Download size={14} /> Download Sample Excel
                    </button>
                </div>
            </div>

            {/* Upload form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>Select Excel File (.xlsx)</label>
                        <input type="file" accept=".xlsx" onChange={e => setFile(e.target.files[0])}
                            style={{ display: 'block', width: '100%', padding: '0.75rem', border: '2px dashed var(--border-light)', borderRadius: '0.75rem', fontSize: '0.9rem', cursor: 'pointer' }} />
                        {file && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#10b981' }}>✓ {file.name}</div>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.875rem', opacity: loading ? 0.7 : 1 }}>
                        <Upload size={18} /> {loading ? 'Creating Students…' : 'Upload & Create Students'}
                    </button>
                </form>
            </div>

            {/* Results */}
            {result && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                            <CheckCircle size={18} color="#10b981" style={{ verticalAlign: 'middle', marginRight: 6 }} />
                            {result.created?.length} students created
                            {result.skipped?.length > 0 && <span style={{ color: '#f59e0b' }}>, {result.skipped.length} skipped</span>}
                        </div>
                        <button className="btn-primary" onClick={downloadCredentials} style={{ background: '#10b981' }}>
                            <Download size={16} /> Download Credentials Excel
                        </button>
                    </div>

                    {result.created?.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>#</th><th>ID</th><th>Name</th><th>Dept/Sem</th><th>Email / Username</th><th>Password</th></tr>
                                </thead>
                                <tbody>
                                    {result.created.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{s.studentId}</td>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.dept} (Sem {s.sem})</td>
                                            <td><code style={{ fontSize: '0.82rem', color: '#6366f1' }}>{s.email}</code></td>
                                            <td><code style={{ fontSize: '0.82rem', color: '#ef4444' }}>{s.password}</code></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {result.errors?.length > 0 && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <AlertTriangle size={15} /> {result.errors.length} row(s) had errors
                            </div>
                            {result.errors.map((e, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', color: '#dc2626' }}>Row {e.row}: {e.issue}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Skipped list */}
            {result?.skipped?.length > 0 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#f59e0b' }}>Skipped (already exist):</strong> {result.skipped.join(', ')}
                </div>
            )}
        </div>
    );
}
