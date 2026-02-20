'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useApp } from './AppProvider';

/**
 * Compute a hash of the first 2MB of a file using SHA-256
 * for lightweight file fingerprint verification.
 */
async function computeFileHash(file: File): Promise<string> {
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
    const slice = file.slice(0, CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function LocalFileSelector() {
    const { setLocalFile, identity, backToDashboard } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [roomName, setRoomName] = useState('');
    const [hashing, setHashing] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef<File | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!validExtensions.includes(ext)) {
            setError('Please select a video file (MP4, MKV, WebM, AVI, MOV)');
            return;
        }

        fileRef.current = file;
        setSelectedFileName(file.name);
        setFileSize(file.size);
        setError('');

        // Auto-fill room name from filename
        if (!roomName) {
            const name = file.name.replace(/\.[^/.]+$/, '');
            setRoomName(name);
        }
    }, [roomName]);

    const handleStartWatching = useCallback(async () => {
        const file = fileRef.current;
        if (!file) {
            setError('Please select a video file first.');
            return;
        }
        if (!roomName.trim()) {
            setError('Please enter a room name so your partner can join the same room.');
            return;
        }

        setHashing(true);
        setError('');

        try {
            const hash = await computeFileHash(file);
            const objectUrl = URL.createObjectURL(file);
            const roomId = btoa(roomName.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, '');

            setLocalFile(
                {
                    name: file.name,
                    size: file.size,
                    objectUrl,
                    hash,
                },
                roomId
            );
        } catch {
            setError('Failed to process the file.');
        } finally {
            setHashing(false);
        }
    }, [roomName, setLocalFile]);

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '—';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div style={styles.container}>
            <div className="xp-window" style={styles.window}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        💻 MnM — Local Sync Mode
                    </span>
                    <div className="xp-title-bar-controls">
                        <button className="xp-title-btn" onClick={backToDashboard} title="Back">
                            ←
                        </button>
                    </div>
                </div>
                <div className="xp-body" style={styles.body}>
                    <p style={styles.info}>
                        Select a video file from your device. Both you and your partner
                        must select the <strong>same file</strong> on your own devices.
                    </p>

                    {/* Room Name */}
                    <div style={styles.field}>
                        <label style={styles.label}>Room Name:</label>
                        <input
                            className="xp-input"
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder='e.g. "naruto-ep1"'
                            style={styles.input}
                        />
                        <span style={styles.hint}>
                            Both users must enter the same room name to sync.
                        </span>
                    </div>

                    {/* File Picker */}
                    <div style={styles.field}>
                        <label style={styles.label}>Video File:</label>
                        <div style={styles.fileRow}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <button
                                className="xp-btn"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ flex: 1 }}
                            >
                                📂 Browse...
                            </button>
                        </div>
                    </div>

                    {/* File Info */}
                    {selectedFileName && (
                        <div className="xp-groupbox" style={styles.fileInfo}>
                            <span className="xp-groupbox-label">Selected File</span>
                            <div style={styles.fileDetail}>
                                <span>🎬 <strong>{selectedFileName}</strong></span>
                                <span style={styles.fileMeta}>{formatSize(fileSize)}</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <p style={styles.error}>{error}</p>
                    )}

                    {/* Start Button */}
                    <button
                        className="xp-btn xp-btn-primary"
                        onClick={handleStartWatching}
                        disabled={!selectedFileName || !roomName.trim() || hashing}
                        style={styles.startBtn}
                    >
                        {hashing ? '⏳ Computing file hash...' : '▶ Start Watching'}
                    </button>

                    <p style={styles.hint}>
                        Logged in as <strong>{identity}</strong> • No video data is sent over the network
                    </p>
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
        maxWidth: 480,
    },
    body: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
    },
    info: {
        fontSize: 12,
        color: '#333',
        lineHeight: '1.5',
        margin: 0,
        paddingBottom: 4,
        borderBottom: '1px solid #808080',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    input: {
        width: '100%',
    },
    hint: {
        fontSize: 10,
        color: '#808080',
    },
    fileRow: {
        display: 'flex',
        gap: 8,
    },
    fileInfo: {
        marginTop: 4,
    },
    fileDetail: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 12,
    },
    fileMeta: {
        fontSize: 11,
        color: '#555',
    },
    error: {
        color: '#c00000',
        fontSize: 11,
        margin: 0,
    },
    startBtn: {
        alignSelf: 'center',
        padding: '6px 24px',
        fontSize: 13,
    },
};
