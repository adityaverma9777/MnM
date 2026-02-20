'use client';

import React, { useState, FormEvent } from 'react';
import { useApp } from './AppProvider';

export default function PasswordGate() {
    const { setPassword } = useApp();
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.trim() }),
            });

            if (res.ok) {
                setPassword(input.trim());
            } else {
                setError('Incorrect password.');
                setInput('');
            }
        } catch {
            setError('Connection failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div className="xp-window" style={styles.window}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        🔒 MnM — Log On to Windows
                    </span>
                </div>
                <div className="xp-body" style={styles.body}>
                    <div style={styles.icon}>🖥️</div>
                    <p style={styles.welcome}>Welcome to MnM</p>
                    <p style={styles.subtitle}>Heyy-Hola.</p>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <label style={styles.label}>Password:</label>
                        <input
                            className="xp-input"
                            type="password"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            style={styles.input}
                            placeholder="Enter password..."
                            autoFocus
                            disabled={loading}
                        />
                        {error && <p style={styles.error}>{error}</p>}
                        <button
                            className="xp-btn xp-btn-primary"
                            type="submit"
                            disabled={loading || !input.trim()}
                            style={styles.button}
                        >
                            {loading ? 'Verifying...' : 'OK'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 16,
    },
    window: {
        width: '100%',
        maxWidth: 380,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: 24,
    },
    icon: {
        fontSize: 48,
        marginBottom: 8,
    },
    welcome: {
        fontSize: 16,
        fontWeight: 'bold',
        margin: 0,
    },
    subtitle: {
        fontSize: 12,
        color: '#555',
        margin: '0 0 12px 0',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
    },
    error: {
        color: '#c00000',
        fontSize: 11,
        margin: 0,
    },
    button: {
        alignSelf: 'flex-end',
        minWidth: 80,
    },
};
