'use client';

import React from 'react';
import { useApp, Identity } from './AppProvider';

export default function IdentitySelector() {
    const { setIdentity } = useApp();

    const handleSelect = (id: Identity) => {
        setIdentity(id);
    };

    return (
        <div style={styles.container}>
            <div className="xp-window" style={styles.window}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        👤 MnM — Select User
                    </span>
                </div>
                <div className="xp-body" style={styles.body}>
                    <p style={styles.title}>Who are you?</p>
                    <p style={styles.subtitle}>Select your identity for this session.</p>

                    <div style={styles.users}>
                        <button
                            className="xp-btn"
                            onClick={() => handleSelect('Aditya')}
                            style={styles.userBtn}
                        >
                            <div style={styles.avatar}>🧑</div>
                            <span style={styles.name}>Aditya</span>
                        </button>

                        <button
                            className="xp-btn"
                            onClick={() => handleSelect('Manika')}
                            style={styles.userBtn}
                        >
                            <div style={styles.avatar}>👩</div>
                            <span style={styles.name}>Manika</span>
                        </button>
                    </div>
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
        maxWidth: 420,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 24,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        margin: 0,
    },
    subtitle: {
        fontSize: 12,
        color: '#555',
        margin: 0,
    },
    users: {
        display: 'flex',
        gap: 24,
        marginTop: 16,
    },
    userBtn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '16px 32px',
        minWidth: 120,
        cursor: 'pointer',
    },
    avatar: {
        fontSize: 48,
    },
    name: {
        fontSize: 14,
        fontWeight: 'bold',
    },
};
