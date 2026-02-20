'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
    src: string;
    onPlay?: (time: number) => void;
    onPause?: (time: number) => void;
    onSeeked?: (time: number) => void;
    onBufferingStart?: () => void;
    onBufferingEnd?: () => void;
    onTimeUpdate?: (time: number) => void;
    onError?: (message: string) => void;
}

export interface VideoPlayerHandle {
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
    isPlaying: () => boolean;
    getVideoElement: () => HTMLVideoElement | null;
}

function isHlsSource(src: string): boolean {
    return src.split('?')[0].toLowerCase().endsWith('.m3u8');
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
    { src, onPlay, onPause, onSeeked, onBufferingStart, onBufferingEnd, onTimeUpdate, onError },
    ref
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Flag to suppress event emission during programmatic changes
    const suppressEventsRef = useRef(false);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
        play: () => {
            suppressEventsRef.current = true;
            videoRef.current?.play().catch(() => { });
            setTimeout(() => { suppressEventsRef.current = false; }, 200);
        },
        pause: () => {
            suppressEventsRef.current = true;
            videoRef.current?.pause();
            setTimeout(() => { suppressEventsRef.current = false; }, 200);
        },
        seekTo: (time: number) => {
            if (videoRef.current) {
                suppressEventsRef.current = true;
                videoRef.current.currentTime = time;
                setTimeout(() => { suppressEventsRef.current = false; }, 300);
            }
        },
        getCurrentTime: () => videoRef.current?.currentTime || 0,
        isPlaying: () => !videoRef.current?.paused,
        getVideoElement: () => videoRef.current,
    }));

    // Initialize video source (HLS or direct)
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        // Cleanup previous HLS instance
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (isHlsSource(src)) {
            // HLS streaming
            if (Hls.isSupported()) {
                const hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: false,
                    maxBufferLength: 30,
                    maxMaxBufferLength: 60,
                });

                hls.loadSource(src);
                hls.attachMedia(video);

                hls.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        onError?.(`HLS Error: ${data.type}`);
                        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                            hls.startLoad();
                        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                            hls.recoverMediaError();
                        }
                    }
                });

                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS (Safari)
                video.src = src;
            }
        } else {
            // Direct video file (mp4, mkv, webm, etc.)
            video.src = src;
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src]);

    // Video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handlePlay = () => {
            setIsPlaying(true);
            if (!suppressEventsRef.current) onPlay?.(video.currentTime);
        };

        const handlePause = () => {
            setIsPlaying(false);
            if (!suppressEventsRef.current) onPause?.(video.currentTime);
        };

        const handleSeeked = () => {
            if (!suppressEventsRef.current) onSeeked?.(video.currentTime);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            onTimeUpdate?.(video.currentTime);
        };

        const handleDurationChange = () => {
            setDuration(video.duration || 0);
        };

        const handleWaiting = () => {
            setIsBuffering(true);
            onBufferingStart?.();
        };

        const handlePlaying = () => {
            setIsBuffering(false);
            onBufferingEnd?.();
        };

        const handleCanPlay = () => {
            setIsBuffering(false);
        };

        const handleError = () => {
            onError?.('Video playback error');
        };

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeked', handleSeeked);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
        };
    }, [onPlay, onPause, onSeeked, onTimeUpdate, onBufferingStart, onBufferingEnd]);

    // Fullscreen change listener
    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Auto-hide controls
    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    }, [isPlaying]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play().catch(() => { });
        } else {
            video.pause();
        }
    }, []);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;
        video.currentTime = parseFloat(e.target.value);
    }, []);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            videoRef.current.muted = val === 0;
            setMuted(val === 0);
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (videoRef.current) {
            const newMuted = !videoRef.current.muted;
            videoRef.current.muted = newMuted;
            setMuted(newMuted);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen().catch(() => { });
        }
    }, []);

    const changePlaybackRate = useCallback(() => {
        const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentIdx = rates.indexOf(playbackRate);
        const next = rates[(currentIdx + 1) % rates.length];
        setPlaybackRate(next);
        if (videoRef.current) videoRef.current.playbackRate = next;
    }, [playbackRate]);

    const formatTime = (t: number) => {
        if (!t || !isFinite(t)) return '0:00';
        const hrs = Math.floor(t / 3600);
        const mins = Math.floor((t % 3600) / 60);
        const secs = Math.floor(t % 60);
        if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            onMouseMove={handleMouseMove}
            onTouchStart={() => setShowControls(true)}
        >
            <video
                ref={videoRef}
                style={styles.video}
                playsInline
                onClick={togglePlay}
            />

            {/* Buffering indicator */}
            {isBuffering && (
                <div style={styles.bufferOverlay}>
                    <span style={{ fontSize: 32 }}>⏳</span>
                    <span>Buffering...</span>
                </div>
            )}

            {/* Controls */}
            <div
                style={{
                    ...styles.controls,
                    opacity: showControls ? 1 : 0,
                    pointerEvents: showControls ? 'auto' : 'none',
                }}
            >
                <div style={styles.progressRow}>
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        style={styles.progressBar}
                    />
                </div>

                <div style={styles.controlRow}>
                    <div style={styles.controlLeft}>
                        <button className="xp-btn" onClick={togglePlay} style={styles.controlBtn}>
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        <button className="xp-btn" onClick={toggleMute} style={styles.controlBtn}>
                            {muted || volume === 0 ? '🔇' : '🔊'}
                        </button>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            style={styles.volumeSlider}
                        />
                        <span style={styles.timeDisplay}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                    <div style={styles.controlRight}>
                        <button className="xp-btn" onClick={changePlaybackRate} style={styles.controlBtn}>
                            {playbackRate}x
                        </button>
                        <button className="xp-btn" onClick={toggleFullscreen} style={styles.controlBtn}>
                            {isFullscreen ? '🗗' : '⛶'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default VideoPlayer;

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'relative',
        width: '100%',
        backgroundColor: '#000',
        aspectRatio: '16/9',
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
    },
    bufferOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        fontSize: 14,
        gap: 8,
        zIndex: 10,
    },
    controls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '24px 8px 8px',
        transition: 'opacity 0.3s ease',
        zIndex: 20,
    },
    progressRow: {
        padding: '0 4px',
        marginBottom: 4,
    },
    progressBar: {
        width: '100%',
        height: 6,
        cursor: 'pointer',
        accentColor: '#316ac5',
    },
    controlRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
    },
    controlLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    controlRight: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    },
    controlBtn: {
        padding: '2px 8px',
        fontSize: 14,
        minHeight: 28,
        minWidth: 32,
    },
    volumeSlider: {
        width: 60,
        height: 4,
        accentColor: '#316ac5',
        cursor: 'pointer',
    },
    timeDisplay: {
        color: '#fff',
        fontSize: 11,
        fontFamily: 'var(--font-main)',
        marginLeft: 8,
        whiteSpace: 'nowrap',
    },
};
