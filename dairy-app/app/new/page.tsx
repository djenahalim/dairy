'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  BookOpen,
  Plus,
  Mic,
  Square,
  X,
  Save,
  LogOut,
  Settings,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTIONS = [
  { emoji: '😊', name: 'happy',   color: '#FEF9C3', border: '#FBBF24' },
  { emoji: '😢', name: 'sad',     color: '#DBEAFE', border: '#60A5FA' },
  { emoji: '😠', name: 'angry',   color: '#FEE2E2', border: '#F87171' },
  { emoji: '🤩', name: 'excited', color: '#FFEDD5', border: '#FB923C' },
  { emoji: '😌', name: 'calm',    color: '#DCFCE7', border: '#4ADE80' },
  { emoji: '😰', name: 'anxious', color: '#F3E8FF', border: '#C084FC' },
];

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── Create Event Page ────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user, getToken } = useAuth();

  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [newEventText, setNewEventText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialLoadDone = useRef(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }
    if (user && !initialLoadDone.current) {
      setDisplayName((user as any).display_name || user.username || 'there');
      setTheme(((user as any).theme as 'light' | 'dark' | 'purple') || 'light');
      initialLoadDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  // ── Apply theme ─────────────────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Add event ───────────────────────────────────────────────────────────────

  const handleAddEvent = async () => {
    if (!newEventText.trim() && !audioBlob) return;
    const token = getToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const dateKey = format(new Date(), 'yyyy-MM-dd');

      const memRes = await fetch('/api/memories', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ date: dateKey, emotion: selectedEmotion }),
      });
      if (!memRes.ok) throw new Error('Failed to create memory');
      const memData = await memRes.json();

      const evRes = await fetch(`/api/memories/${memData.id}/events`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ text: newEventText.trim() || '(audio note)' }),
      });
      if (!evRes.ok) throw new Error('Failed to create event');

      setNewEventText('');
      setAudioBlob(null);
      setSaved(true);

      // After a short delay, go back to the home page
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      console.error('Failed to add event', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Audio ───────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="loading-screen">
        <BookOpen size={48} className="loading-icon" />
        <p>Opening your diary…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="diary-app" data-theme={theme}>
      {/* ── Header ── */}
      <header className="diary-header">
        <div className="header-inner">
          <div className="header-brand">
            <button
              className="nav-icon-btn"
              onClick={() => router.push('/')}
              title="Back to diary"
              style={{ marginRight: '4px' }}
            >
              <ArrowLeft size={20} />
            </button>
            <BookOpen size={24} className="brand-icon" />
            <span className="brand-name">New Entry</span>
          </div>
          <nav className="header-nav">
            <div className="user-chip">
              <User size={16} />
              <span>{displayName}</span>
            </div>
            <button
              className="nav-icon-btn logout-btn"
              onClick={() => { logout(); router.push('/auth'); }}
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </nav>
        </div>
      </header>

      <main className="diary-main">
        {/* ── Greeting ── */}
        <div className="date-banner">
          <p className="date-day">{greeting}, {displayName} 👋</p>
          <p className="date-full">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* ── Success state ── */}
        {saved ? (
          <section className="diary-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>
              Entry saved!
            </p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '.9rem' }}>
              Taking you back to your diary…
            </p>
          </section>
        ) : (
          <section className="diary-section">
            <h2 className="section-title">
              <Plus size={18} />
              What's on your mind?
            </h2>

            {/* Emotion picker */}
            <div className="emotion-grid" style={{ marginBottom: '20px' }}>
              {EMOTIONS.map((em) => (
                <button
                  key={em.name}
                  onClick={() => setSelectedEmotion(em.name)}
                  className={`emotion-btn ${selectedEmotion === em.name ? 'emotion-btn--active' : ''}`}
                  style={selectedEmotion === em.name ? { background: em.color, borderColor: em.border } : {}}
                >
                  <span className="em-emoji">{em.emoji}</span>
                  <span className="em-name">{em.name}</span>
                </button>
              ))}
            </div>

            {/* Diary paper textarea */}
            <div className="diary-paper">
              <div className="paper-lines" aria-hidden="true" />
              <textarea
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                placeholder="Dear diary, today I…"
                className="diary-textarea paper-textarea"
                rows={8}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddEvent();
                }}
              />
            </div>

            {/* Audio controls */}
            {isRecording ? (
              <div className="recording-bar">
                <span className="rec-dot" />
                <span>Recording…</span>
                <button className="btn btn-ghost btn-sm" onClick={stopRecording}>
                  <Square size={14} /> Stop
                </button>
              </div>
            ) : (
              <div className="action-row">
                <button className="btn btn-ghost btn-sm" onClick={startRecording}>
                  <Mic size={15} /> Record Audio
                </button>
                {audioBlob && (
                  <span className="audio-ready">
                    🎙 Audio ready
                    <button className="icon-btn" onClick={() => setAudioBlob(null)}>
                      <X size={13} />
                    </button>
                  </span>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => router.push('/')}
                style={{ flex: '0 0 auto' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={handleAddEvent}
                disabled={isSaving || (!newEventText.trim() && !audioBlob)}
              >
                <Save size={16} />
                {isSaving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
