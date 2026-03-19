import { useState, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';

export default function UploadPage() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef();

    const handleFile = (f) => {
        if (!f) return;
        if (!f.name.endsWith('.xlsx')) { toast.error('Only .xlsx files are allowed'); return; }
        setFile(f); setResult(null);
    };

    const handleUpload = async () => {
        if (!file) return toast.error('Please select a file first');
        const fd = new FormData();
        fd.append('file', file);
        setUploading(true);
        try {
            const { data } = await api.post('/admin/upload-questions', fd);
            setResult(data);
            if (data.success) toast.success(`${data.totalValid} questions uploaded!`);
        } catch (err) {
            const d = err.response?.data;
            setResult(d);
            toast.error(d?.message || 'Upload failed');
        } finally { setUploading(false); }
    };

    const downloadTemplate = () => {
        // Create a simple CSV-like explanation as text
        const csvContent = 'NO.,QUESTION,OPTION A,OPTION B,OPTION C,OPTION D,ANSWER,SUBJECT,MARKS\n1,What is 2+2?,1,2,3,4,D,Math,1\n2,Capital of France?,Berlin,London,Paris,Rome,C,Geography,1';
        const blob = new Blob([csvContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Sample template downloaded (convert to .xlsx before uploading)');
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Upload Questions</h1>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Bulk upload MCQs via Excel file (.xlsx)</p>
            </div>

            {/* Format Guide */}
            <div className="card" style={{ marginBottom: '1.5rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={18} /> Required Column Format
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.4rem' }}>
                    {['NO.', 'QUESTION', 'OPTION A', 'OPTION B', 'OPTION C', 'OPTION D', 'ANSWER', 'SUBJECT', 'MARKS'].map((col) => (
                        <span key={col} style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '0.3rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', textAlign: 'center' }}>{col}</span>
                    ))}
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
                    ⚡ ANSWER must be A/B/C/D · MARKS defaults to 1
                </div>
                <button onClick={downloadTemplate} className="btn-secondary" style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.875rem' }}>
                    <Download size={14} /> Download Sample
                </button>
            </div>

            {/* Drop Zone */}
            <div
                className="card"
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? '#6366f1' : file ? '#10b981' : 'var(--border-light)'}`, cursor: 'pointer', textAlign: 'center', padding: '3rem 1rem', background: dragging ? 'rgba(99,102,241,0.04)' : file ? 'rgba(16,185,129,0.04)' : 'transparent', transition: 'all 0.2s ease', marginBottom: '1.5rem' }}>
                <input ref={fileRef} type="file" accept=".xlsx" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
                {file ? (
                    <>
                        <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                        <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>{file.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{(file.size / 1024).toFixed(1)} KB — Click to change</div>
                    </>
                ) : (
                    <>
                        <Upload size={40} color="#6366f1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Drag & Drop your .xlsx file</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>or click to browse · Max 5MB</div>
                    </>
                )}
            </div>

            <button className="btn-primary" onClick={handleUpload} disabled={!file || uploading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem', fontWeight: 700, opacity: !file || uploading ? 0.6 : 1, marginBottom: '1.5rem' }}>
                <Upload size={18} /> {uploading ? 'Uploading...' : 'Upload Questions'}
            </button>

            {/* Result */}
            {result && (
                <div className="card animate-fade-in">
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Upload Result</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.875rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 size={20} color="#10b981" />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10b981' }}>{result.totalValid ?? 0}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Uploaded</div>
                            </div>
                        </div>
                        <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <XCircle size={20} color="#ef4444" />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#ef4444' }}>{result.totalErrors ?? 0}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Errors</div>
                            </div>
                        </div>
                    </div>

                    {result.errors?.length > 0 && (
                        <>
                            <div style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#ef4444' }}>
                                <AlertTriangle size={16} /> Error Report
                            </div>
                            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {result.errors.map((e, i) => (
                                    <div key={i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.06)', borderRadius: '0.5rem', fontSize: '0.8rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        <div style={{ fontWeight: 700 }}>Row {e.row}: {e.question}</div>
                                        <ul style={{ margin: '0.25rem 0 0 1rem', color: '#ef4444' }}>
                                            {e.issues?.map((iss, j) => <li key={j}>{iss}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
