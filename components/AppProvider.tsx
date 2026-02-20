'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type Identity = 'Aditya' | 'Manika' | null;
export type AppView = 'password' | 'identity' | 'modeselect' | 'dashboard' | 'localfile' | 'watchroom';
export type PlaybackMode = 'cloud' | 'local' | null;

export interface VideoFile {
    key: string;
    name: string;
    size: number;
    lastModified: string;
    id: string;
}

export interface LocalFile {
    name: string;
    size: number;
    objectUrl: string;
    hash: string;
}

interface AppState {
    view: AppView;
    identity: Identity;
    password: string | null;
    mode: PlaybackMode;
    selectedVideo: VideoFile | null;
    localFile: LocalFile | null;
    roomId: string | null;
    setView: (view: AppView) => void;
    setIdentity: (identity: Identity) => void;
    setPassword: (password: string) => void;
    setMode: (mode: PlaybackMode) => void;
    selectVideo: (video: VideoFile) => void;
    setLocalFile: (file: LocalFile, roomId: string) => void;
    logout: () => void;
    backToDashboard: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<AppView>('password');
    const [identity, setIdentityState] = useState<Identity>(null);
    const [password, setPasswordState] = useState<string | null>(null);
    const [mode, setModeState] = useState<PlaybackMode>(null);
    const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
    const [localFile, setLocalFileState] = useState<LocalFile | null>(null);
    const [roomId, setRoomId] = useState<string | null>(null);

    // Restore session from localStorage on mount
    useEffect(() => {
        const savedPassword = localStorage.getItem('mnm_password');
        const savedIdentity = localStorage.getItem('mnm_identity') as Identity;

        if (savedPassword) {
            setPasswordState(savedPassword);
            if (savedIdentity) {
                setIdentityState(savedIdentity);
                setView('modeselect');
            } else {
                setView('identity');
            }
        }
    }, []);

    const setPassword = useCallback((pw: string) => {
        localStorage.setItem('mnm_password', pw);
        setPasswordState(pw);
        setView('identity');
    }, []);

    const setIdentity = useCallback((id: Identity) => {
        if (id) localStorage.setItem('mnm_identity', id);
        setIdentityState(id);
        setView('modeselect');
    }, []);

    const setMode = useCallback((m: PlaybackMode) => {
        setModeState(m);
        if (m === 'cloud') {
            setView('dashboard');
        } else if (m === 'local') {
            setView('localfile');
        }
    }, []);

    const selectVideo = useCallback((video: VideoFile) => {
        setSelectedVideo(video);
        setRoomId(video.id);
        setView('watchroom');
    }, []);

    const setLocalFile = useCallback((file: LocalFile, rid: string) => {
        setLocalFileState(file);
        setRoomId(rid);
        setView('watchroom');
    }, []);

    const backToDashboard = useCallback(() => {
        // Revoke object URL if it exists
        if (localFile?.objectUrl) {
            URL.revokeObjectURL(localFile.objectUrl);
        }
        setSelectedVideo(null);
        setLocalFileState(null);
        setRoomId(null);
        setView('modeselect');
    }, [localFile]);

    const logout = useCallback(() => {
        if (localFile?.objectUrl) {
            URL.revokeObjectURL(localFile.objectUrl);
        }
        localStorage.removeItem('mnm_password');
        localStorage.removeItem('mnm_identity');
        setPasswordState(null);
        setIdentityState(null);
        setModeState(null);
        setSelectedVideo(null);
        setLocalFileState(null);
        setRoomId(null);
        setView('password');
    }, [localFile]);

    return (
        <AppContext.Provider
            value={{
                view,
                identity,
                password,
                mode,
                selectedVideo,
                localFile,
                roomId,
                setView,
                setIdentity,
                setPassword,
                setMode,
                selectVideo,
                setLocalFile,
                logout,
                backToDashboard,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}
