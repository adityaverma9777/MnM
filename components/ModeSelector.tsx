'use client';

import React from 'react';
import { useApp } from './AppProvider';

export default function ModeSelector() {
    const { setMode, identity, logout } = useApp();

    return (
        <div style={styles.container}>
            <div className="xp-window" style={styles.window}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        🎬 MnM — Select Mode
                    </span>
                    <div className="xp-title-bar-controls">
                        <button className="xp-title-btn" onClick={logout} title="Log Out">
                            ✕
                        </button>
                    </div>
                </div>
                <div className="xp-body" style={styles.body}>
                    <p style={styles.welcome}>Welcome, {identity}!</p>
                    <p style={styles.subtitle}>How do you want to watch?</p>

                    <div style={styles.options}>
                        {/* Cloud Mode */}
                        <button
                            className="xp-btn"
                            onClick={() => setMode('cloud')}
                            style={styles.optionBtn}
                        >
                            <div style={styles.icon}>☁️</div>
                            <div style={styles.optionTitle}>Cloud Mode</div>
                            <div style={styles.optionDesc}>
                                Stream from R2 storage.<br />
                                Videos hosted in the cloud.
                            </div>
                        </button>

                        {/* Local Mode */}
                        <button
                            className="xp-btn"
                            onClick={() => setMode('local')}
                            style={styles.optionBtn}
                        >
                            <div style={styles.icon}>💻</div>
                            <div style={styles.optionTitle}>Local Mode</div>
                            <div style={styles.optionDesc}>
                                Both users load the same file<br />
                                from their own device. Zero streaming.
                            </div>
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
        maxWidth: 520,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 24,
    },
    welcome: {
        fontSize: 16,
        fontWeight: 'bold',
        margin: 0,
    },
    subtitle: {
        fontSize: 12,
        color: '#555',
        margin: 0,
    },
    options: {
        display: 'flex',
        gap: 16,
        marginTop: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    optionBtn: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '20px 24px',
        minWidth: 180,
        cursor: 'pointer',
        textAlign: 'center',
    },
    icon: {
        fontSize: 40,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    optionDesc: {
        fontSize: 11,
        color: '#555',
        lineHeight: '1.4',
    },
};
