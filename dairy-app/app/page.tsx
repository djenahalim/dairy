'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, isSameDay } from 'date-fns';
import {
  BookOpen,
  Plus,
  Mic,
  Square,
  X,
  Trash2,
  Edit,
  Save,
  Play,
  Pause,
  LogOut,
  Settings,
  User,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  text: string;
  audio_url?: string;
}

interface Memory {
  id: string;
  date: string;
  emotion: string;
  events: Event[];
  created_at: string;
  updated_at: string;
}

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

// ─── Event Item (read-only with edit/delete) ──────────────────────────────────

function EventItem({
  event: ev,
  memoryId,
  onDelete,
  onEdit,
}: {
  event: Event;
  memoryId: string;
  onDelete: (memId: string, evId: string) => void;
  onEdit: (memId: string, evId: string, text: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(ev.text);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(memoryId, ev.id, editText);
      setIsEditing(false);
    }
  };

  const toggleAudio = () => {
    if (ev.audio_url && audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); }
      else { audioRef.current.play(); }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="home-event-item">
      <div className="home-event-content">
        {isEditing ? (
          <div className="edit-row">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="diary-textarea edit-textarea"
              autoFocus
              rows={2}
            />
            <button className="icon-btn save-btn" onClick={handleSave} title="Save">
              <Save size={15} />
            </button>
          </div>
        ) : (
          <p className="home-event-text">{ev.text}</p>
        )}
        {ev.audio_url && (
          <div className="audio-row">
            <audio ref={audioRef} src={ev.audio_url} onEnded={() => setIsPlaying(false)} />
            <button className="audio-btn" onClick={toggleAudio}>
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? 'Pause' : 'Play'} audio</span>
            </button>
          </div>
        )}
      </div>
      <div className="entry-actions">
        {!isEditing && (
          <button className="icon-btn" onClick={() => setIsEditing(true)} title="Edit">
            <Edit size={14} />
          </button>
        )}
        <button className="icon-btn delete-btn" onClick={() => onDelete(memoryId, ev.id)} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Home Page ───────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user, getToken } = useAuth();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedEmotion, setSelectedEmotion] = useState('happy');
  const [newEventText, setNewEventText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark' | 'purple'>('light');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialLoadDone = useRef(false);

  // ── Load memories ───────────────────────────────────────────────────────────

  const loadMemories = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/memories', { headers: authHeaders(token) });
      if (!res.ok) return;
      const data: any[] = await res.json();

      const withEvents = await Promise.all(
        data.map(async (m) => {
          const evRes = await fetch(`/api/memories/${m.id}/events`, {
            headers: authHeaders(token),
          });
          const events = evRes.ok ? await evRes.json() : [];
          return {
            id: String(m.id),
            date: m.date,
            emotion: m.emotion,
            events: events.map((e: any) => ({
              id: String(e.id),
              text: e.text,
              audio_url: e.audio_url || undefined,
            })),
            created_at: m.created_at,
            updated_at: m.updated_at,
          } as Memory;
        })
      );
      setMemories(withEvents);
    } catch (err) {
      console.error('Failed to load memories', err);
    }
  }, [getToken]);

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
      loadMemories();
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
      await loadMemories();
    } catch (err) {
      console.error('Failed to add event', err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete event ────────────────────────────────────────────────────────────

  const handleDeleteEvent = async (memoryId: string, eventId: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/memories/${memoryId}/events/${eventId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      await loadMemories();
    } catch (err) {
      console.error('Failed to delete event', err);
    }
  };

  // ── Edit event ──────────────────────────────────────────────────────────────

  const handleEditEvent = async (memoryId: string, eventId: string, newText: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/memories/${memoryId}/events/${eventId}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ text: newText }),
      });
      await loadMemories();
    } catch (err) {
      console.error('Failed to edit event', err);
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

  // ── Derived data ────────────────────────────────────────────────────────────

  // All events across all memories, sorted newest first (by memory date then event order)
  const allEvents = memories
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((m) =>
      m.events.map((ev) => ({ ...ev, memory: m }))
    );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = allEvents.filter((e) => e.memory.date === todayStr);
  const recentEvents = allEvents.filter((e) => e.memory.date !== todayStr).slice(0, 10);

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
            <BookOpen size={24} className="brand-icon" />
            <span className="brand-name">My Diary</span>
          </div>
          <nav className="header-nav">
            <button
              className="nav-icon-btn"
              onClick={() => router.push('/new')}
              title="Full diary view"
            >
              <Settings size={20} />
            </button>
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

        {/* ── Add Event Section ── */}
        <section className="diary-section">
          <h2 className="section-title">
            <Plus size={18} />
            Add a new entry
          </h2>

          {/* Emotion picker */}
          <div className="emotion-grid" style={{ marginBottom: '16px' }}>
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
              rows={5}
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

          <button
            className="btn btn-primary btn-full"
            onClick={handleAddEvent}
            disabled={isSaving || (!newEventText.trim() && !audioBlob)}
          >
            <Plus size={16} />
            {isSaving ? 'Saving…' : 'Save Entry'}
          </button>
        </section>

        {/* ── Today's Entries ── */}
        {todayEvents.length > 0 && (
          <section className="diary-section">
            <h2 className="section-title">
              <Clock size={17} />
              Today's entries
              <span className="entry-count">{todayEvents.length}</span>
            </h2>
            <div className="events-list">
              {todayEvents.map((ev) => (
                <EventItem
                  key={ev.id}
                  event={ev}
                  memoryId={ev.memory.id}
                  onDelete={handleDeleteEvent}
                  onEdit={handleEditEvent}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Recent Past Entries ── */}
        {recentEvents.length > 0 && (
          <section className="diary-section">
            <h2 className="section-title">
              <BookOpen size={17} />
              Recent entries
            </h2>
            <div className="events-list">
              {recentEvents.map((ev) => {
                const em = EMOTIONS.find((e) => e.name === ev.memory.emotion);
                return (
                  <div key={`${ev.memory.id}-${ev.id}`} className="home-recent-item">
                    <div className="recent-meta">
                      <span className="recent-date">
                        {isSameDay(parseISO(ev.memory.date), new Date())
                          ? 'Today'
                          : format(parseISO(ev.memory.date), 'MMM d, yyyy')}
                      </span>
                      <span
                        className="recent-emotion"
                        style={{ background: em?.color, borderColor: em?.border }}
                      >
                        {em?.emoji} {ev.memory.emotion}
                      </span>
                    </div>
                    <EventItem
                      event={ev}
                      memoryId={ev.memory.id}
                      onDelete={handleDeleteEvent}
                      onEdit={handleEditEvent}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {allEvents.length === 0 && (
          <section className="diary-section empty-state">
            <BookOpen size={48} className="empty-icon" />
            <p>Your diary is empty. Write your first entry above!</p>
          </section>
        )}

        {/* ── Link to full diary ── */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push('/new')}
            style={{ gap: '8px' }}
          >
            Open full diary view
            <ChevronRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
