'use client';

import { useState, useEffect, useRef } from 'react';
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
  User,
  ArrowLeft,
  Loader2,
  Menu,
  Star,
  Lock,
  Share2,
  Bell,
  HelpCircle,
  Globe,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOTIONS = [
  { emoji: '😊', name: 'happy',    color: '#FEF9C3', border: '#FBBF24' },
  { emoji: '😢', name: 'sad',      color: '#DBEAFE', border: '#60A5FA' },
  { emoji: '😠', name: 'angry',    color: '#FEE2E2', border: '#F87171' },
  { emoji: '🤩', name: 'excited',  color: '#FFEDD5', border: '#FB923C' },
  { emoji: '😌', name: 'calm',     color: '#DCFCE7', border: '#4ADE80' },
  { emoji: '😰', name: 'anxious',  color: '#F3E8FF', border: '#C084FC' },
  { emoji: '🥰', name: 'loved',    color: '#FFE4E6', border: '#FB7185' },
  { emoji: '😭', name: 'crying',   color: '#EFF6FF', border: '#93C5FD' },
  { emoji: '😐', name: 'neutral',  color: '#F3F4F6', border: '#9CA3AF' },
  { emoji: '😂', name: 'laughing', color: '#FEF9C3', border: '#FDE047' },
];

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── Typewriter helper ────────────────────────────────────────────────────────

function typewriterAppend(
  existing: string,
  addition: string,
  setText: (s: string) => void,
  speed = 14,
) {
  let i = 0;
  const base = existing ? existing + '\n' : '';
  const tick = () => {
    i++;
    setText(base + addition.slice(0, i));
    if (i < addition.length) setTimeout(tick, speed);
  };
  setTimeout(tick, speed);
}

// ─── Burger Menu ──────────────────────────────────────────────────────────────

function BurgerMenu({ displayName, onLogout }: { displayName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => setOpen(false);

  const items = [
    { icon: <Star size={18} />,       label: 'Upgrade to Pro', accent: true,  onClick: () => { close(); alert('Pro upgrade coming soon!'); } },
    { icon: <Lock size={18} />,       label: 'Diary Lock',                    onClick: () => { close(); alert('Diary lock coming soon!'); } },
    { icon: <Share2 size={18} />,     label: 'Share App',                     onClick: () => { close(); if (navigator.share) { navigator.share({ title: 'My Diary', url: window.location.origin }); } else { navigator.clipboard.writeText(window.location.origin); alert('Link copied!'); } } },
    { icon: <Settings size={18} />,   label: 'Settings',                      onClick: () => { close(); alert('Settings coming soon!'); } },
    { icon: <Bell size={18} />,       label: 'Notifications',                 onClick: () => { close(); alert('Notifications coming soon!'); } },
    { icon: <HelpCircle size={18} />, label: 'Help Center',                   onClick: () => { close(); alert('Help center coming soon!'); } },
    { icon: <Globe size={18} />,      label: 'Language',                      onClick: () => { close(); alert('Language settings coming soon!'); } },
    { icon: <LogOut size={18} />,     label: 'Logout',         danger: true,  onClick: () => { close(); onLogout(); } },
  ];

  return (
    <>
      <button className="nav-icon-btn burger-btn" onClick={() => setOpen(true)} title="Menu" aria-label="Open menu">
        <Menu size={22} />
      </button>
      {open && <div className="drawer-backdrop" onClick={close} aria-hidden="true" />}
      <div className={`drawer${open ? ' drawer--open' : ''}`} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div className="drawer-user">
            <div className="drawer-avatar"><User size={20} /></div>
            <div>
              <p className="drawer-username">{displayName}</p>
              <p className="drawer-tagline">My Diary</p>
            </div>
          </div>
          <button className="drawer-close" onClick={close}><X size={20} /></button>
        </div>
        <nav className="drawer-nav">
          {items.map((item) => (
            <button
              key={item.label}
              className={`drawer-item${item.accent ? ' drawer-item--accent' : ''}${item.danger ? ' drawer-item--danger' : ''}`}
              onClick={item.onClick}
            >
              <span className="drawer-item-icon">{item.icon}</span>
              <span className="drawer-item-label">{item.label}</span>
              <ChevronRight size={15} className="drawer-item-chevron" />
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

// ─── Create Event Page ────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user, getToken } = useAuth();

  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(['happy']);
  const [eventText, setEventText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'purple'>('light');
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialLoadDone = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/auth'); return; }
    if (user && !initialLoadDone.current) {
      setDisplayName(user.username || (user as any).display_name || 'there');
      setTheme(((user as any).theme as 'light' | 'dark' | 'purple') || 'light');
      initialLoadDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Toggle emotion ──────────────────────────────────────────────────────────

  const toggleEmotion = (name: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(name)
        ? prev.length > 1 ? prev.filter((e) => e !== name) : prev
        : [...prev, name]
    );
  };

  // ── Recording ───────────────────────────────────────────────────────────────

  const startRecording = async () => {
    setAudioError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscribe(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch {
      setAudioError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ── Transcribe ──────────────────────────────────────────────────────────────

  const handleTranscribe = async (blob: Blob) => {
    const token = getToken();
    if (!token) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Transcription failed');
      }
      const data = await res.json();
      const transcribed: string = data.text || '';
      // Append transcribed text to textarea with typewriter animation
      typewriterAppend(eventText, transcribed, setEventText, 14);
    } catch (err: unknown) {
      setAudioError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Save event ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const token = getToken();
    if (!token || !eventText.trim()) return;
    setIsSaving(true);
    try {
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      const emotionValue = selectedEmotions.join(',');

      const memRes = await fetch('/api/memories', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ date: dateKey, emotion: emotionValue }),
      });
      if (!memRes.ok) throw new Error('Failed to create memory');
      const memData = await memRes.json();

      const evRes = await fetch(`/api/memories/${memData.id}/events`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ text: eventText.trim() }),
      });
      if (!evRes.ok) throw new Error('Failed to create event');

      setEventText('');
      setSaved(true);
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      console.error('Failed to save', err);
    } finally {
      setIsSaving(false);
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
  const isBusy = isSaving || isTranscribing;

  return (
    <div className="diary-app" data-theme={theme}>
      {/* ── Header ── */}
      <header className="diary-header">
        <div className="header-inner">
          <div className="header-brand">
            <button className="nav-icon-btn" onClick={() => router.push('/')} title="Back" style={{ marginRight: '4px' }}>
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
            <BurgerMenu displayName={displayName} onLogout={() => { logout(); router.push('/auth'); }} />
          </nav>
        </div>
      </header>

      <main className="diary-main">
        <div className="date-banner">
          <p className="date-day">{greeting}, {displayName} 👋</p>
          <p className="date-full">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>

        {/* ── Success ── */}
        {saved ? (
          <section className="diary-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>Entry saved!</p>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '.9rem' }}>Taking you back to your diary…</p>
          </section>
        ) : (
          <section className="diary-section">
            <h2 className="section-title">
              <Plus size={18} />
              What's on your mind?
            </h2>

            {/* ── Emotion multi-picker ── */}
            <div style={{ marginBottom: '20px' }}>
              <p className="emotion-picker-label">
                How are you feeling? <span className="emotion-picker-hint">(select all that apply)</span>
              </p>
              <div className="emotion-grid">
                {EMOTIONS.map((em) => {
                  const active = selectedEmotions.includes(em.name);
                  return (
                    <button
                      key={em.name}
                      onClick={() => toggleEmotion(em.name)}
                      className={`emotion-btn${active ? ' emotion-btn--active' : ''}`}
                      style={active ? { background: em.color, borderColor: em.border } : {}}
                    >
                      <span className="em-emoji">{em.emoji}</span>
                      <span className="em-name">{em.name}</span>
                      {active && <span className="em-check">✓</span>}
                    </button>
                  );
                })}
              </div>
              {selectedEmotions.length > 0 && (
                <p className="emotion-selected-summary">
                  Feeling: {selectedEmotions.map((n) => {
                    const em = EMOTIONS.find((e) => e.name === n);
                    return em ? `${em.emoji} ${em.name}` : n;
                  }).join(' · ')}
                </p>
              )}
            </div>

            {/* ── Textarea ── */}
            <div className="diary-paper">
              <div className="paper-lines" aria-hidden="true" />
              <textarea
                ref={textareaRef}
                value={eventText}
                onChange={(e) => setEventText(e.target.value)}
                placeholder="Dear diary, today I…"
                className="diary-textarea paper-textarea"
                rows={8}
                autoFocus
                disabled={isBusy}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
              />
            </div>

            {/* ── Record button row ── */}
            <div className="record-row">
              {isTranscribing ? (
                <div className="transcribing-inline">
                  <Loader2 size={16} className="spin-icon" />
                  <span>Transcribing…</span>
                </div>
              ) : isRecording ? (
                <button className="record-btn record-btn--active" onClick={stopRecording}>
                  <span className="rec-dot" />
                  <Square size={14} />
                  Stop recording
                </button>
              ) : (
                <button className="record-btn" onClick={startRecording} disabled={isBusy}>
                  <Mic size={16} />
                  Record voice note
                </button>
              )}

              {audioError && (
                <span className="record-error">⚠️ {audioError}</span>
              )}
            </div>

            {/* ── Action buttons ── */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => router.push('/')}
                disabled={isBusy}
                style={{ flex: '0 0 auto' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={isBusy || !eventText.trim()}
              >
                {isSaving ? <Loader2 size={16} className="spin-icon" /> : <Save size={16} />}
                {isSaving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
