'use client';

import React, { useEffect, useState } from 'react';
import { useApp, VideoFile } from './AppProvider';

function formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function FileManager() {
    const { password, identity, selectVideo, logout, backToDashboard } = useApp();
    const [videos, setVideos] = useState<VideoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/videos', {
                headers: { 'x-mnm-password': password || '' },
            });
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setVideos(data.videos || []);
        } catch {
            setError('Failed to load videos from cloud storage.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div className="xp-window" style={styles.window}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        📁 MnM — File Manager
                    </span>
                    <div className="xp-title-bar-controls">
                        <button className="xp-title-btn" onClick={backToDashboard} title="Back">
                            ←
                        </button>
                        <button className="xp-title-btn" onClick={logout} title="Log Out">
                            ✕
                        </button>
                    </div>
                </div>


                <div className="xp-menubar">
                    <span className="xp-menubar-item" onClick={fetchVideos}>
                        🔄 Refresh
                    </span>
                </div>

                <div className="xp-body" style={styles.body}>

                    <div style={styles.addressBar}>
                        <span style={styles.addressLabel}>📍 Address</span>
                        <div className="xp-input" style={styles.addressInput}>
                            R2://mnm-videos/
                        </div>
                    </div>


                    <div style={styles.infoBar}>
                        <span>Logged in as <strong>{identity}</strong></span>
                        <span>{videos.length} object(s)</span>
                    </div>


                    <div className="xp-listview" style={styles.listView}>

                        <div className="xp-listview-header">
                            <div style={{ flex: 3 }}>Name</div>
                            <div style={{ flex: 1 }}>Size</div>
                            <div style={{ flex: 2 }}>Date Modified</div>
                        </div>

                        {loading && (
                            <div style={styles.status}>Loading files...</div>
                        )}

                        {error && (
                            <div style={{ ...styles.status, color: '#c00000' }}>{error}</div>
                        )}

                        {!loading && !error && videos.length === 0 && (
                            <div style={styles.status}>
                                No video files found. Upload videos to your R2 bucket.
                            </div>
                        )}

                        {videos.map((video) => (
                            <div
                                key={video.id}
                                className="xp-listview-item"
                                onClick={() => selectVideo(video)}
                            >
                                <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>🎬</span>
                                    <span>{video.name}</span>
                                </div>
                                <div style={{ flex: 1 }}>{formatSize(video.size)}</div>
                                <div style={{ flex: 2 }}>{formatDate(video.lastModified)}</div>
                            </div>
                        ))}
                    </div>
                </div>


                <div className="xp-statusbar">
                    <div className="xp-statusbar-section">
                        {loading
                            ? 'Loading...'
                            : error
                                ? 'Error'
                                : `${videos.length} item(s) | Cloud storage connected`}
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
        maxWidth: 640,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    addressBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    addressLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
    },
    addressInput: {
        flex: 1,
        fontSize: 12,
        color: '#555',
    },
    infoBar: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#555',
    },
    listView: {
        minHeight: 240,
        maxHeight: 400,
    },
    status: {
        padding: 24,
        textAlign: 'center',
        fontSize: 12,
        color: '#555',
    },
};
