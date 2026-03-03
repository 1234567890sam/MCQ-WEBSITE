import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-light)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
                <Outlet />
            </div>
            <footer style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid var(--border-light)' }}>
                Developed by <span style={{ fontWeight: 700, color: '#6366f1' }}>M Saad Shaikh</span>
            </footer>
        </div>
    );
}
