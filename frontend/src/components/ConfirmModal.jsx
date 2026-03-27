import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

/* ── Context ──────────────────────────────────────────────────────── */
const ConfirmContext = createContext(null);

/* ── Provider ─────────────────────────────────────────────────────── */
export function ConfirmProvider({ children }) {
    const [modal, setModal] = useState(null); // { message, title, variant, resolve }

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setModal({ message, resolve, ...options });
        });
    }, []);

    const handleChoice = (result) => {
        modal?.resolve(result);
        setModal(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {modal && <ConfirmDialog modal={modal} onChoice={handleChoice} />}
        </ConfirmContext.Provider>
    );
}

/* ── Hook ─────────────────────────────────────────────────────────── */
export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
    return ctx;
}

/* ── Modal Dialog ─────────────────────────────────────────────────── */
function ConfirmDialog({ modal, onChoice }) {
    const isDanger = modal.variant === 'danger';
    const isInfo = modal.variant === 'info';

    const iconColor = isDanger ? '#ef4444' : isInfo ? '#6366f1' : '#f59e0b';
    const iconBg = isDanger ? 'rgba(239,68,68,0.12)' : isInfo ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)';
    const Icon = isDanger ? Trash2 : isInfo ? Info : AlertTriangle;

    const title = modal.title || (isDanger ? 'Delete Confirmation' : 'Are you sure?');
    const confirmLabel = modal.confirmLabel || (isDanger ? 'Delete' : 'Confirm');
    const cancelLabel = modal.cancelLabel || 'Cancel';

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={() => onChoice(false)}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(15,23,42,0.55)',
                    backdropFilter: 'blur(4px)',
                    animation: 'fadeInBd 0.15s ease',
                }}
            />

            {/* Modal */}
            <div
                style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        background: 'var(--card-light, #fff)',
                        border: '1px solid var(--border-light, #e2e8f0)',
                        borderRadius: '1.25rem',
                        padding: '2rem',
                        width: '100%',
                        maxWidth: '420px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
                        pointerEvents: 'all',
                        animation: 'popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative',
                    }}
                >
                    {/* Close X */}
                    <button
                        onClick={() => onChoice(false)}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: '#94a3b8', padding: '0.25rem', borderRadius: '0.5rem',
                            display: 'flex', alignItems: 'center', transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <X size={18} />
                    </button>

                    {/* Icon */}
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                        background: iconBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1.25rem',
                    }}>
                        <Icon size={22} color={iconColor} />
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontSize: '1.1rem', fontWeight: 800,
                        color: 'var(--text-light, #0f172a)',
                        marginBottom: '0.5rem',
                    }}>
                        {title}
                    </h2>

                    {/* Message */}
                    <p style={{
                        fontSize: '0.9rem', color: '#64748b',
                        lineHeight: 1.6, marginBottom: '1.75rem',
                    }}>
                        {modal.message}
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => onChoice(false)}
                            className="btn-secondary"
                            style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => onChoice(true)}
                            style={{
                                padding: '0.6rem 1.25rem', fontSize: '0.875rem',
                                fontWeight: 700, border: 'none', borderRadius: '0.75rem',
                                cursor: 'pointer', transition: 'all 0.2s',
                                background: isDanger
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white',
                                boxShadow: isDanger
                                    ? '0 4px 15px rgba(239,68,68,0.35)'
                                    : '0 4px 15px rgba(99,102,241,0.35)',
                            }}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInBd { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.88) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
}
