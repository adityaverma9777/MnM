'use client';

import React, { useState, useRef, useEffect, FormEvent } from 'react';

export interface ChatMessage {
    text: string;
    sender: string;
    timestamp: number;
}

interface ChatPanelProps {
    messages: ChatMessage[];
    identity: string;
    onSend: (text: string) => void;
    isOpen: boolean;
    onToggle: () => void;
    peerChatOpen?: boolean;
}

export default function ChatPanel({
    messages,
    identity,
    onSend,
    isOpen,
    onToggle,
    peerChatOpen,
}: ChatPanelProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSend(input.trim());
        setInput('');
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) {
        return (
            <button className="xp-btn" onClick={onToggle} style={styles.toggleBtn}>
                💬 Chat
            </button>
        );
    }

    return (
        <div className="xp-window" style={styles.panel}>
            <div className="xp-title-bar" style={styles.titleBar}>
                <span className="xp-title-bar-text" style={{ fontSize: 11 }}>
                    💬 Chat
                    {peerChatOpen !== undefined && (
                        <span style={{ fontWeight: 'normal', opacity: 0.7, marginLeft: 8 }}>
                            {peerChatOpen ? '(partner viewing)' : '(partner closed)'}
                        </span>
                    )}
                </span>
                <div className="xp-title-bar-controls">
                    <button className="xp-title-btn" onClick={onToggle}>
                        _
                    </button>
                </div>
            </div>

            <div ref={scrollRef} style={styles.messages}>
                {messages.length === 0 && (
                    <div style={styles.emptyState}>No messages yet.</div>
                )}
                {messages.map((msg, i) => {
                    const isSelf = msg.sender === identity;
                    return (
                        <div
                            key={i}
                            style={{
                                ...styles.message,
                                alignSelf: isSelf ? 'flex-end' : 'flex-start',
                            }}
                        >
                            <div style={styles.msgHeader}>
                                <strong style={{ color: isSelf ? '#0a246a' : '#800000' }}>
                                    {msg.sender}
                                </strong>
                                <span style={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                            </div>
                            <div style={styles.msgText}>{msg.text}</div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} style={styles.inputRow}>
                <input
                    className="xp-input"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={styles.chatInput}
                />
                <button className="xp-btn" type="submit" disabled={!input.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    panel: {
        width: '100%',
        maxWidth: 360,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: 480,
    },
    titleBar: {
        minHeight: 24,
        padding: '2px 6px',
    },
    toggleBtn: {
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 100,
        padding: '8px 16px',
        fontSize: 14,
    },
    messages: {
        flex: 1,
        overflowY: 'auto',
        padding: 8,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 200,
        boxShadow: 'inset 1px 1px 0 #808080, inset -1px -1px 0 #fff',
    },
    emptyState: {
        textAlign: 'center',
        color: '#808080',
        fontSize: 11,
        padding: 24,
    },
    message: {
        maxWidth: '80%',
        padding: 4,
        borderBottom: '1px solid #eee',
    },
    msgHeader: {
        display: 'flex',
        gap: 8,
        alignItems: 'baseline',
        fontSize: 11,
    },
    msgTime: {
        fontSize: 10,
        color: '#808080',
    },
    msgText: {
        fontSize: 12,
        marginTop: 2,
        wordWrap: 'break-word',
    },
    inputRow: {
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'var(--xp-bg)',
    },
    chatInput: {
        flex: 1,
        fontSize: 12,
    },
};
