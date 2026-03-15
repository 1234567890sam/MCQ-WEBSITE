import { useEffect, useRef, useCallback } from 'react';

/**
 * useAntiCheat – Reusable anti-cheat hook for exam mode.
 *
 * @param {object} options
 * @param {boolean} options.enabled       - Whether anti-cheat is active (only during exam step).
 * @param {number}  options.maxWarnings   - Violations before auto-submit (default: 3).
 * @param {Function} options.onWarning    - Called with (warningCount, message) on each violation.
 * @param {Function} options.onAutoSubmit - Called when warnings exceed maxWarnings.
 */
export default function useAntiCheat({ enabled, maxWarnings = 3, onWarning, onAutoSubmit }) {
    const warningCount = useRef(0);
    const submitFired = useRef(false);

    const triggerViolation = useCallback((message) => {
        if (!enabled || submitFired.current) return;

        warningCount.current += 1;
        onWarning?.(warningCount.current, message);

        if (warningCount.current >= maxWarnings) {
            submitFired.current = true;
            onAutoSubmit?.();
        }
    }, [enabled, maxWarnings, onWarning, onAutoSubmit]);

    // ── Fullscreen helpers ───────────────────────────────────────────────
    const requestFullscreen = useCallback(() => {
        const el = document.documentElement;
        const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        fn?.call(el);
    }, []);

    const exitListenerRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        // Enter fullscreen when exam starts
        requestFullscreen();

        // Detect fullscreen exit
        const onFsChange = () => {
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
            if (!isFs) {
                triggerViolation('⚠️ You exited fullscreen! Re-entering fullscreen...');
                setTimeout(requestFullscreen, 800);
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        document.addEventListener('mozfullscreenchange', onFsChange);
        exitListenerRef.current = onFsChange;

        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            document.removeEventListener('mozfullscreenchange', onFsChange);
        };
    }, [enabled, requestFullscreen, triggerViolation]);

    // ── Tab switch / window blur ─────────────────────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const onVisibilityChange = () => {
            if (document.hidden) {
                triggerViolation('⚠️ Tab switch detected! Do not leave the exam tab.');
            }
        };
        const onBlur = () => {
            triggerViolation('⚠️ Window lost focus! Keep focus on the exam.');
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onBlur);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', onBlur);
        };
    }, [enabled, triggerViolation]);

    // ── Keyboard shortcuts (DevTools, View Source) ───────────────────────
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e) => {
            const blocked =
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(e.key.toUpperCase())) ||
                (e.ctrlKey && e.key.toUpperCase() === 'U') ||
                (e.ctrlKey && e.key.toUpperCase() === 'S') ||
                (e.ctrlKey && e.key.toUpperCase() === 'A') ||
                (e.ctrlKey && e.key.toUpperCase() === 'C') ||
                (e.ctrlKey && e.key.toUpperCase() === 'X') ||
                (e.ctrlKey && e.key.toUpperCase() === 'V');

            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [enabled]);

    // ── Right click, copy, cut, paste, select ───────────────────────────
    useEffect(() => {
        if (!enabled) return;

        const prevent = (e) => e.preventDefault();

        document.addEventListener('contextmenu', prevent);
        document.addEventListener('copy', prevent);
        document.addEventListener('cut', prevent);
        document.addEventListener('paste', prevent);
        document.addEventListener('selectstart', prevent);

        return () => {
            document.removeEventListener('contextmenu', prevent);
            document.removeEventListener('copy', prevent);
            document.removeEventListener('cut', prevent);
            document.removeEventListener('paste', prevent);
            document.removeEventListener('selectstart', prevent);
        };
    }, [enabled]);

    // ── CSS: disable user-select + long press (mobile) ───────────────────
    useEffect(() => {
        if (!enabled) return;

        const style = document.createElement('style');
        style.id = 'anti-cheat-styles';
        style.textContent = `
            body * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
            }
            input, textarea, select {
                -webkit-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.getElementById('anti-cheat-styles')?.remove();
        };
    }, [enabled]);

    // ── Cleanup on unmount: exit fullscreen, reset counter ───────────────
    useEffect(() => {
        return () => {
            warningCount.current = 0;
            submitFired.current = false;
            const exitFs = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen;
            try { exitFs?.call(document); } catch { /* ignore */ }
        };
    }, []);

    return { warningCount };
}
