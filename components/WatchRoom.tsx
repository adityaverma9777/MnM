'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useApp } from './AppProvider';
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer';
import ChatPanel, { ChatMessage } from './ChatPanel';
import {
    useSyncEngine,
    PlaybackStateEvent,
    BufferStateEvent,
    TimeSyncEvent,
    ChatMessageEvent,
    ChatUiStateEvent,
    RequestStateEvent,
    FileHashEvent,
    PresenceState,
} from '@/lib/syncEngine';

export default function WatchRoom() {
    const { identity, selectedVideo, localFile, mode, password, roomId, backToDashboard } = useApp();
    const playerRef = useRef<VideoPlayerHandle>(null);

    // State
    const [streamUrl, setStreamUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(mode === 'cloud');
    const [error, setError] = useState('');
    const [peerOnline, setPeerOnline] = useState(false);
    const [peerName, setPeerName] = useState('');
    const [peerBuffering, setPeerBuffering] = useState(false);
    const [bufferNotice, setBufferNotice] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [peerChatOpen, setPeerChatOpen] = useState<boolean | undefined>(undefined);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [notification, setNotification] = useState('');
    const [hashWarning, setHashWarning] = useState('');

    // Refs
    const localBufferingRef = useRef(false);
    const peerBufferingRef = useRef(false);

    const effectiveRoomId = roomId || selectedVideo?.id || 'default';
    const videoTitle = mode === 'local' ? localFile?.name : selectedVideo?.name;

    // ===== Notification helper =====
    const showNotification = useCallback((msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 4000);
    }, []);

    // ===== Sync Engine Callbacks =====

    const handlePlaybackState = useCallback((event: PlaybackStateEvent) => {
        const player = playerRef.current;
        if (!player) return;

        if (event.state === 'playing') {
            player.seekTo(event.time);
            player.play();
        } else if (event.state === 'paused') {
            player.pause();
            player.seekTo(event.time);
        } else if (event.state === 'seeked') {
            player.seekTo(event.time);
        }
    }, []);

    const handleBufferState = useCallback((event: BufferStateEvent) => {
        peerBufferingRef.current = event.isBuffering;
        setPeerBuffering(event.isBuffering);

        if (event.isBuffering) {
            setBufferNotice(`Waiting for ${event.sender}…`);
            playerRef.current?.pause();
        } else {
            setBufferNotice('');
            if (!localBufferingRef.current) {
                playerRef.current?.play();
            }
        }
    }, []);

    const handleTimeSync = useCallback((event: TimeSyncEvent) => {
        const player = playerRef.current;
        if (!player) return;

        const localTime = player.getCurrentTime();
        const drift = Math.abs(localTime - event.time) * 1000;

        if (drift > 500) {
            player.seekTo(event.time);
        }

        const localPlaying = player.isPlaying();
        if (event.state === 'playing' && !localPlaying && !peerBufferingRef.current && !localBufferingRef.current) {
            player.play();
        } else if (event.state === 'paused' && localPlaying) {
            player.pause();
        }
    }, []);

    const handleChatMessage = useCallback((event: ChatMessageEvent) => {
        setMessages((prev) => [
            ...prev,
            { text: event.text, sender: event.sender, timestamp: event.timestamp },
        ]);
    }, []);

    const handleChatUiState = useCallback((event: ChatUiStateEvent) => {
        setPeerChatOpen(event.isOpen);
    }, []);

    const handleRequestState = useCallback((_event: RequestStateEvent) => {
        const player = playerRef.current;
        if (!player) return;
        const time = player.getCurrentTime();
        const playing = player.isPlaying();
        syncEngine.emitPlaybackState(playing ? 'playing' : 'paused', time);

        // Also re-send file hash in local mode
        if (mode === 'local' && localFile?.hash) {
            syncEngine.emitFileHash(localFile.hash, localFile.name);
        }
    }, [mode, localFile]);

    const handleFileHash = useCallback((event: FileHashEvent) => {
        if (mode === 'local' && localFile?.hash) {
            if (event.hash !== localFile.hash) {
                setHashWarning(
                    `⚠️ File mismatch! ${event.sender} has "${event.fileName}" but your file hash differs. You may be watching different versions.`
                );
            } else {
                setHashWarning('');
                showNotification(`✅ File verified — same file as ${event.sender}`);
            }
        }
    }, [mode, localFile, showNotification]);

    const handlePresenceChange = useCallback((state: PresenceState) => {
        setPeerOnline(state.online);
        setPeerName(state.identity);
        if (state.online) {
            showNotification(`${state.identity} joined the room`);
        } else {
            showNotification(`${state.identity} left the room`);
        }
    }, [showNotification]);

    // ===== Sync Engine =====
    const syncEngine = useSyncEngine({
        videoId: effectiveRoomId,
        identity,
        onPlaybackState: handlePlaybackState,
        onBufferState: handleBufferState,
        onTimeSync: handleTimeSync,
        onChatMessage: handleChatMessage,
        onChatUiState: handleChatUiState,
        onRequestState: handleRequestState,
        onFileHash: handleFileHash,
        onPresenceChange: handlePresenceChange,
    });

    // ===== Setup video source =====
    useEffect(() => {
        if (mode === 'local' && localFile?.objectUrl) {
            setStreamUrl(localFile.objectUrl);
            setLoadingUrl(false);
        } else if (mode === 'cloud' && selectedVideo && password) {
            setLoadingUrl(true);
            const fetchUrl = async () => {
                try {
                    const res = await fetch(
                        `/api/videos/stream?id=${encodeURIComponent(selectedVideo.id)}`,
                        { headers: { 'x-mnm-password': password } }
                    );
                    if (!res.ok) throw new Error('Failed to get stream URL');
                    const data = await res.json();
                    setStreamUrl(data.url);
                } catch {
                    setError('Failed to load video stream.');
                } finally {
                    setLoadingUrl(false);
                }
            };
            fetchUrl();
        }
    }, [mode, localFile, selectedVideo, password]);

    // ===== Broadcast file hash on connect (local mode) =====
    useEffect(() => {
        if (syncEngine.connected && mode === 'local' && localFile?.hash) {
            syncEngine.emitFileHash(localFile.hash, localFile.name);
            syncEngine.requestCurrentState();
        } else if (syncEngine.connected && mode === 'cloud') {
            syncEngine.requestCurrentState();
        }
    }, [syncEngine.connected, mode, localFile]);

    // ===== Periodic time sync =====
    useEffect(() => {
        const interval = setInterval(() => {
            const player = playerRef.current;
            if (!player) return;
            const time = player.getCurrentTime();
            const playing = player.isPlaying();
            if (playing) {
                syncEngine.emitTimeSync(time, 'playing');
            }
        }, syncEngine.TIME_SYNC_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [syncEngine]);

    // ===== Player event handlers =====

    const handlePlay = useCallback(
        (time: number) => { syncEngine.emitPlaybackState('playing', time); },
        [syncEngine]
    );

    const handlePause = useCallback(
        (time: number) => { syncEngine.emitPlaybackState('paused', time); },
        [syncEngine]
    );

    const handleSeeked = useCallback(
        (time: number) => { syncEngine.emitPlaybackState('seeked', time); },
        [syncEngine]
    );

    const handleBufferingStart = useCallback(() => {
        localBufferingRef.current = true;
        syncEngine.emitBufferState(true);
    }, [syncEngine]);

    const handleBufferingEnd = useCallback(() => {
        localBufferingRef.current = false;
        syncEngine.emitBufferState(false);
    }, [syncEngine]);

    // ===== Chat handlers =====

    const handleSendMessage = useCallback(
        (text: string) => {
            syncEngine.emitChatMessage(text);
            setMessages((prev) => [
                ...prev,
                { text, sender: identity || '', timestamp: Date.now() },
            ]);
        },
        [syncEngine, identity]
    );

    const handleChatToggle = useCallback(() => {
        const newState = !chatOpen;
        setChatOpen(newState);
        syncEngine.emitChatUiState(newState);
    }, [chatOpen, syncEngine]);

    // ===== Render =====

    return (
        <div style={styles.container}>
            {/* Notification toast */}
            {notification && (
                <div className="xp-notification">{notification}</div>
            )}

            {/* Top bar */}
            <div className="xp-window" style={styles.topBar}>
                <div className="xp-title-bar">
                    <span className="xp-title-bar-text">
                        🎬 {videoTitle || 'Watch Room'}
                        {mode === 'local' && <span style={{ fontWeight: 'normal', opacity: 0.7 }}> (Local)</span>}
                    </span>
                    <div className="xp-title-bar-controls">
                        <button className="xp-title-btn" onClick={backToDashboard} title="Back">
                            ←
                        </button>
                    </div>
                </div>

                {/* Status bar */}
                <div className="xp-statusbar" style={{ borderTop: 'none' }}>
                    <div className="xp-statusbar-section">
                        <span style={{ marginRight: 12 }}>
                            {syncEngine.connected ? '🟢 Connected' : '🔴 Disconnected'}
                        </span>
                        <span>
                            {peerOnline
                                ? `👤 ${peerName} is here`
                                : '👻 Waiting for partner...'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Hash mismatch warning */}
            {hashWarning && (
                <div style={styles.hashWarning}>
                    {hashWarning}
                    <button className="xp-btn" onClick={() => setHashWarning('')} style={{ marginLeft: 8 }}>
                        Dismiss
                    </button>
                </div>
            )}

            {/* Main content */}
            <div style={styles.main}>
                {/* Video area */}
                <div style={styles.videoArea}>
                    {loadingUrl && (
                        <div style={styles.loadingOverlay}>
                            <p>Loading stream...</p>
                        </div>
                    )}

                    {error && (
                        <div style={styles.loadingOverlay}>
                            <p style={{ color: '#c00000' }}>{error}</p>
                            <button className="xp-btn" onClick={backToDashboard}>
                                Back
                            </button>
                        </div>
                    )}

                    {streamUrl && (
                        <VideoPlayer
                            ref={playerRef}
                            src={streamUrl}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeeked={handleSeeked}
                            onBufferingStart={handleBufferingStart}
                            onBufferingEnd={handleBufferingEnd}
                        />
                    )}

                    {/* Buffer notice overlay */}
                    {(bufferNotice || peerBuffering) && (
                        <div style={styles.bufferNotice}>
                            <div className="xp-window" style={{ maxWidth: 300 }}>
                                <div className="xp-title-bar" style={{ minHeight: 22, padding: '2px 6px' }}>
                                    <span className="xp-title-bar-text" style={{ fontSize: 11 }}>
                                        ⏳ Buffering
                                    </span>
                                </div>
                                <div className="xp-body" style={{ padding: 12, textAlign: 'center' }}>
                                    <p style={{ fontSize: 13, margin: 0 }}>{bufferNotice}</p>
                                    <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                                        Playback paused to stay in sync.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat sidebar / overlay */}
                <div style={styles.chatArea}>
                    <ChatPanel
                        messages={messages}
                        identity={identity || ''}
                        onSend={handleSendMessage}
                        isOpen={chatOpen}
                        onToggle={handleChatToggle}
                        peerChatOpen={peerChatOpen}
                    />
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 8,
        gap: 4,
    },
    topBar: {
        width: '100%',
    },
    hashWarning: {
        background: '#fffde7',
        border: '1px solid #ffc107',
        padding: '6px 12px',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    main: {
        flex: 1,
        display: 'flex',
        gap: 8,
        minHeight: 0,
    },
    videoArea: {
        flex: 1,
        position: 'relative',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    chatArea: {
        flexShrink: 0,
    },
    loadingOverlay: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 14,
        gap: 12,
        padding: 24,
    },
    bufferNotice: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        zIndex: 50,
    },
};
