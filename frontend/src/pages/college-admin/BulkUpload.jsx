import { useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Upload, Users, Download, CheckCircle, AlertTriangle, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BulkUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return toast.error('Please select an Excel file');
        setLoading(true);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const { data } = await api.post('/college-admin/bulk-students', fd);
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
        a.href = url;
        a.download = 'student_credentials.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadSample = async () => {
        try {
            const r = await api.get('/college-admin/download-sample/students', { responseType: 'blob' });
            const url = URL.createObjectURL(r.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bulk_students_sample.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch { toast.error('Sample download failed'); }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Bulk Creating Students</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Upload an Excel file to create student accounts for your college in bulk</p>
                </div>
            </div>

            {/* Format info */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={18} color="#10b981" /> Required Excel Format
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
                    {[
                        { col: 'NAME', desc: 'Full name (required)' },
                        { col: 'STUDENT ID', desc: 'Unique enrollment ID (used for login/pass)' },
                        { col: 'EMAIL', desc: 'Login email (optional)' },
                        { col: 'DEPARTMENT', desc: 'e.g. Computer Science' },
                        { col: 'SEMESTER', desc: 'e.g. 6' },
                    ].map(({ col, desc }) => (
                        <div key={col} style={{ padding: '0.4rem 0.6rem', background: 'var(--card-light)', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                            <code style={{ color: '#10b981', fontWeight: 700, fontSize: '0.75rem' }}>{col}</code>
                            <div style={{ color: '#64748b', fontSize: '0.65rem' }}>{desc}</div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>💡 Passwords are automatically set same as the **STUDENT ID**.</div>
                    <button onClick={downloadSample}
                        style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
                            style={{ display: 'block', width: '100%', padding: '1rem', border: '2px dashed var(--border-light)', borderRadius: '0.75rem', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center' }} />
                        {file && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>✓ {file.name}</div>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '1rem', opacity: loading ? 0.7 : 1, background: '#10b981' }}>
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
                            {result.skipped?.length > 0 && <span style={{ color: '#f59e0b' }}>, {result.skipped.length} emails already exist</span>}
                        </div>
                        <button className="btn-primary" onClick={downloadCredentials} style={{ background: '#059669', fontSize: '0.85rem' }}>
                            <Download size={16} /> Download Credentials Report
                        </button>
                    </div>

                    {result.created?.length > 0 && (
                        <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                            <table className="table">
                                <thead style={{ background: 'var(--card-light)' }}>
                                    <tr><th>#</th><th>ID</th><th>Name</th><th>Dept/Sem</th><th>Email / Username</th><th>Password</th></tr>
                                </thead>
                                <tbody>
                                    {result.created.map((s, i) => (
                                        <tr key={i}>
                                            <td style={{ color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                                            <td style={{ fontWeight: 700, color: '#10b981' }}>{s.studentId}</td>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{s.dept} (Sem {s.sem})</td>
                                            <td><code style={{ fontSize: '0.82rem', color: '#10b981' }}>{s.email}</code></td>
                                            <td><code style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 700 }}>{s.password}</code></td>
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
        </div>
    );
}
