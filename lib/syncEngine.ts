'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Identity } from '@/components/AppProvider';



export interface PlaybackStateEvent {
    type: 'playback_state';
    state: 'playing' | 'paused' | 'seeked';
    time: number;
    sender: string;
    timestamp: number;
}

export interface BufferStateEvent {
    type: 'buffer_state';
    isBuffering: boolean;
    sender: string;
    timestamp: number;
}

export interface TimeSyncEvent {
    type: 'time_sync';
    time: number;
    state: 'playing' | 'paused';
    sender: string;
    timestamp: number;
}

export interface ChatMessageEvent {
    type: 'chat_message';
    text: string;
    sender: string;
    timestamp: number;
}

export interface ChatUiStateEvent {
    type: 'chat_ui_state';
    isOpen: boolean;
    sender: string;
}

export interface RequestStateEvent {
    type: 'request_state';
    sender: string;
}

export interface FileHashEvent {
    type: 'file_hash';
    hash: string;
    fileName: string;
    sender: string;
}

export interface PresenceState {
    identity: string;
    online: boolean;
}

export type SyncEvent =
    | PlaybackStateEvent
    | BufferStateEvent
    | TimeSyncEvent
    | ChatMessageEvent
    | ChatUiStateEvent
    | RequestStateEvent
    | FileHashEvent;


const DRIFT_TOLERANCE_MS = 500;
const TIME_SYNC_INTERVAL_MS = 3000;



interface UseSyncEngineOptions {
    videoId: string;
    identity: Identity;
    onPlaybackState?: (event: PlaybackStateEvent) => void;
    onBufferState?: (event: BufferStateEvent) => void;
    onTimeSync?: (event: TimeSyncEvent) => void;
    onChatMessage?: (event: ChatMessageEvent) => void;
    onChatUiState?: (event: ChatUiStateEvent) => void;
    onRequestState?: (event: RequestStateEvent) => void;
    onFileHash?: (event: FileHashEvent) => void;
    onPresenceChange?: (state: PresenceState) => void;
}

export function useSyncEngine(options: UseSyncEngineOptions) {
    const {
        videoId,
        identity,
        onPlaybackState,
        onBufferState,
        onTimeSync,
        onChatMessage,
        onChatUiState,
        onRequestState,
        onPresenceChange,
    } = options;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const [connected, setConnected] = useState(false);


    const callbackRefs = useRef(options);
    callbackRefs.current = options;

    useEffect(() => {
        if (!videoId || !identity) return;

        const channelName = `watchroom-${videoId}`;

        const channel = getSupabase().channel(channelName, {
            config: {
                presence: { key: identity },
                broadcast: { self: false },
            },
        });

        channel.on('broadcast', { event: 'sync' }, (payload: { payload: SyncEvent }) => {
            const data = payload.payload as SyncEvent;
            if (!data || data.sender === identity) return;

            switch (data.type) {
                case 'playback_state':
                    callbackRefs.current.onPlaybackState?.(data);
                    break;
                case 'buffer_state':
                    callbackRefs.current.onBufferState?.(data);
                    break;
                case 'time_sync':
                    callbackRefs.current.onTimeSync?.(data);
                    break;
                case 'chat_message':
                    callbackRefs.current.onChatMessage?.(data);
                    break;
                case 'chat_ui_state':
                    callbackRefs.current.onChatUiState?.(data);
                    break;
                case 'request_state':
                    callbackRefs.current.onRequestState?.(data);
                    break;
                case 'file_hash':
                    callbackRefs.current.onFileHash?.(data);
                    break;
            }
        });

        channel.on('presence', { event: 'join' }, ({ key }: { key: string }) => {
            if (key !== identity) {
                callbackRefs.current.onPresenceChange?.({ identity: key, online: true });
            }
        });

        channel.on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
            if (key !== identity) {
                callbackRefs.current.onPresenceChange?.({ identity: key, online: false });
            }
        });

        channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                setConnected(true);
                await channel.track({ identity, online: true });
            }
        });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
            setConnected(false);
        };
    }, [videoId, identity]);

    const broadcast = useCallback(
        (event: SyncEvent) => {
            if (!channelRef.current) return;
            channelRef.current.send({
                type: 'broadcast',
                event: 'sync',
                payload: event,
            });
        },
        []
    );

    const emitPlaybackState = useCallback(
        (state: 'playing' | 'paused' | 'seeked', time: number) => {
            if (!identity) return;
            broadcast({
                type: 'playback_state',
                state,
                time,
                sender: identity,
                timestamp: Date.now(),
            });
        },
        [identity, broadcast]
    );

    const emitBufferState = useCallback(
        (isBuffering: boolean) => {
            if (!identity) return;
            broadcast({
                type: 'buffer_state',
                isBuffering,
                sender: identity,
                timestamp: Date.now(),
            });
        },
        [identity, broadcast]
    );

    const emitTimeSync = useCallback(
        (time: number, state: 'playing' | 'paused') => {
            if (!identity) return;
            broadcast({
                type: 'time_sync',
                time,
                state,
                sender: identity,
                timestamp: Date.now(),
            });
        },
        [identity, broadcast]
    );

    const emitChatMessage = useCallback(
        (text: string) => {
            if (!identity) return;
            broadcast({
                type: 'chat_message',
                text,
                sender: identity,
                timestamp: Date.now(),
            });
        },
        [identity, broadcast]
    );

    const emitChatUiState = useCallback(
        (isOpen: boolean) => {
            if (!identity) return;
            broadcast({
                type: 'chat_ui_state',
                isOpen,
                sender: identity,
            });
        },
        [identity, broadcast]
    );

    const requestCurrentState = useCallback(() => {
        if (!identity) return;
        broadcast({
            type: 'request_state',
            sender: identity,
        });
    }, [identity, broadcast]);

    const emitFileHash = useCallback(
        (hash: string, fileName: string) => {
            if (!identity) return;
            broadcast({
                type: 'file_hash',
                hash,
                fileName,
                sender: identity,
            });
        },
        [identity, broadcast]
    );

    return {
        connected,
        emitPlaybackState,
        emitBufferState,
        emitTimeSync,
        emitChatMessage,
        emitChatUiState,
        requestCurrentState,
        emitFileHash,
        DRIFT_TOLERANCE_MS,
        TIME_SYNC_INTERVAL_MS,
    };
}
