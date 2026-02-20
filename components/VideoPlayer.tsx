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
    onAudioTrackChange?: (trackIndex: number) => void;
    onError?: (message: string) => void;
}

export interface AudioTrackInfo {
    index: number;
    label: string;
    language: string;
}

export interface VideoPlayerHandle {
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
    getCurrentTime: () => number;
    isPlaying: () => boolean;
    getVideoElement: () => HTMLVideoElement | null;
    setAudioTrack: (trackIndex: number) => void;
    getAudioTracks: () => AudioTrackInfo[];
}

function isHlsSource(src: string): boolean {
    return src.split('?')[0].toLowerCase().endsWith('.m3u8');
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
    { src, onPlay, onPause, onSeeked, onBufferingStart, onBufferingEnd, onTimeUpdate, onAudioTrackChange, onError },
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
    const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
    const [activeAudioTrack, setActiveAudioTrack] = useState(0);
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const suppressAudioEventRef = useRef(false);


    const suppressEventsRef = useRef(false);


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
        setAudioTrack: (trackIndex: number) => {
            suppressAudioEventRef.current = true;
            const hls = hlsRef.current;
            if (hls && hls.audioTracks.length > trackIndex) {
                hls.audioTrack = trackIndex;
                setActiveAudioTrack(trackIndex);
            } else {
                // Native HTML5 audioTracks
                const video = videoRef.current;
                if (video && (video as any).audioTracks) {
                    const tracks = (video as any).audioTracks;
                    for (let i = 0; i < tracks.length; i++) {
                        tracks[i].enabled = i === trackIndex;
                    }
                    setActiveAudioTrack(trackIndex);
                }
            }
            setTimeout(() => { suppressAudioEventRef.current = false; }, 200);
        },
        getAudioTracks: () => audioTracks,
    }));


    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;


        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (isHlsSource(src)) {

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

                // Detect HLS audio tracks
                hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
                    const tracks: AudioTrackInfo[] = hls.audioTracks.map((t, i) => ({
                        index: i,
                        label: t.name || `Track ${i + 1}`,
                        language: t.lang || 'unknown',
                    }));
                    setAudioTracks(tracks);
                });

                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {

                video.src = src;
            }
        } else {
            // Direct video file
            video.src = src;

            // Detect native audio tracks after metadata loads
            const detectNativeTracks = () => {
                const nativeTracks = (video as any).audioTracks;
                if (nativeTracks && nativeTracks.length > 1) {
                    const tracks: AudioTrackInfo[] = [];
                    for (let i = 0; i < nativeTracks.length; i++) {
                        tracks.push({
                            index: i,
                            label: nativeTracks[i].label || nativeTracks[i].language || `Track ${i + 1}`,
                            language: nativeTracks[i].language || 'unknown',
                        });
                    }
                    setAudioTracks(tracks);
                }
            };
            video.addEventListener('loadedmetadata', detectNativeTracks);
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [src]);


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


    useEffect(() => {
        const handleFsChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);


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


            {isBuffering && (
                <div style={styles.bufferOverlay}>
                    <span style={{ fontSize: 32 }}>⏳</span>
                    <span>Buffering...</span>
                </div>
            )}


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
                        {audioTracks.length > 1 && (
                            <div style={{ position: 'relative' }}>
                                <button
                                    className="xp-btn"
                                    onClick={() => setShowAudioMenu(!showAudioMenu)}
                                    style={styles.controlBtn}
                                    title="Audio Track"
                                >
                                    🔈
                                </button>
                                {showAudioMenu && (
                                    <div style={styles.audioMenu}>
                                        {audioTracks.map((track) => (
                                            <div
                                                key={track.index}
                                                style={{
                                                    ...styles.audioMenuItem,
                                                    background: track.index === activeAudioTrack ? '#316ac5' : 'transparent',
                                                    color: track.index === activeAudioTrack ? '#fff' : '#000',
                                                }}
                                                onClick={() => {
                                                    const hls = hlsRef.current;
                                                    if (hls && hls.audioTracks.length > track.index) {
                                                        hls.audioTrack = track.index;
                                                    } else {
                                                        const video = videoRef.current;
                                                        if (video && (video as any).audioTracks) {
                                                            const native = (video as any).audioTracks;
                                                            for (let i = 0; i < native.length; i++) {
                                                                native[i].enabled = i === track.index;
                                                            }
                                                        }
                                                    }
                                                    setActiveAudioTrack(track.index);
                                                    setShowAudioMenu(false);
                                                    if (!suppressAudioEventRef.current) {
                                                        onAudioTrackChange?.(track.index);
                                                    }
                                                }}
                                            >
                                                {track.label} ({track.language})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
    audioMenu: {
        position: 'absolute',
        bottom: '100%',
        right: 0,
        background: '#c0c0c0',
        border: '2px solid #fff',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        minWidth: 160,
        zIndex: 30,
        marginBottom: 4,
    },
    audioMenuItem: {
        padding: '4px 8px',
        fontSize: 11,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    },
};
