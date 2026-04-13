'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  parseISO,
} from 'date-fns';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  User,
  Settings,
  Calendar,
  X,
  Mic,
  Square,
  Plus,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Save,
  Pencil,
  Play,
  Pause,
  BookOpen,
  GripVertical,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  text: string;
  audio_url?: string;
  audioBlob?: Blob;
  audioUrl?: string;
}

interface Memory {
  id: string;
  date: string;
  emotion: string;
  events: Event[];
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  displayName: string;
  theme: 'light' | 'dark' | 'purple';
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

// ─── API helpers ──────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── Sortable Event Item ──────────────────────────────────────────────────────

function SortableEventItem({
  id,
  event: eventItem,
  onDelete,
  onEdit,
}: {
  id: string;
  event: Event;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(eventItem.text);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(id, editText);
      setIsEditing(false);
    }
  };

  const audioSrc = eventItem.audioUrl || eventItem.audio_url;

  const toggleAudio = () => {
    if (audioSrc && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="diary-entry-item"
    >
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="drag-handle"
        title="Drag to reorder"
      >
        <GripVertical size={16} />
      </span>

      <div className="entry-content">
        {isEditing ? (
          <div className="edit-row">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="diary-textarea edit-textarea"
              autoFocus
              rows={3}
            />
            <button className="icon-btn save-btn" onClick={handleSave} title="Save">
              <Save size={16} />
            </button>
          </div>
        ) : (
          <p className="entry-text">{eventItem.text}</p>
        )}

        {audioSrc && (
          <div className="audio-row">
            <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} />
            <button className="audio-btn" onClick={toggleAudio}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause' : 'Play'} audio note</span>
            </button>
          </div>
        )}
      </div>

      <div className="entry-actions">
        {!isEditing && (
          <button className="icon-btn" onClick={() => setIsEditing(true)} title="Edit">
            <Edit size={15} />
          </button>
        )}
        <button className="icon-btn delete-btn" onClick={() => onDelete(id)} title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Memory Preview Modal ─────────────────────────────────────────────────────

function MemoryPreview({
  memory,
  onClose,
  onDelete,
}: {
  memory: Memory;
  onClose: () => void;
  onDelete: () => void;
}) {
  const emotion = EMOTIONS.find((e) => e.name === memory.emotion);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card diary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {format(parseISO(memory.date), 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="modal-subtitle">
              {memory.events.length} event{memory.events.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="emotion-badge" style={{ background: emotion?.color, borderColor: emotion?.border }}>
          <span className="emotion-emoji">{emotion?.emoji || '😊'}</span>
          <span className="emotion-label">{memory.emotion}</span>
        </div>

        <div className="modal-events">
          {memory.events.map((ev) => (
            <div key={ev.id} className="modal-event-item">
              <p>{ev.text}</p>
              {(ev.audioUrl || ev.audio_url) && (
                <audio src={ev.audioUrl || ev.audio_url} controls className="audio-player" />
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 size={15} />
            Delete Memory
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────

function CalendarView({
  memories,
  onDateSelect,
  currentDate,
}: {
  memories: Memory[];
  onDateSelect: (date: Date) => void;
  currentDate: Date;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const hasMemory = (date: Date) =>
    memories.some((m) => isSameDay(parseISO(m.date), date));

  return (
    <div className="calendar-grid-wrap">
      <div className="cal-header-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
      </div>
      <div className="cal-days-grid">
        {calendarDays.map((date, i) => {
          const inMonth = date >= monthStart && date <= monthEnd;
          const hasMem = hasMemory(date);
          const isToday = isSameDay(date, new Date());
          return (
            <button
              key={i}
              onClick={() => onDateSelect(date)}
              className={`cal-day ${!inMonth ? 'cal-day--out' : ''} ${hasMem ? 'cal-day--has-memory' : ''} ${isToday && !hasMem ? 'cal-day--today' : ''}`}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (s: UserSettings) => void;
}) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [theme, setTheme] = useState<UserSettings['theme']>(settings.theme);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ displayName, theme });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="settings-field">
          <label className="field-label">Display Name</label>
          <input
            className="diary-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="field-label">Theme</label>
          <div className="theme-row">
            {(['light', 'dark', 'purple'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`theme-btn ${theme === t ? 'theme-btn--active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={15} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DiaryApp() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user, getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'today' | 'past'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmotion, setSelectedEmotion] = useState<string>('happy');
  const [newEvent, setNewEvent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ displayName: 'User', theme: 'light' });
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Load memories from API ──────────────────────────────────────────────────

  const loadMemories = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/memories', { headers: authHeaders(token) });
      if (!res.ok) return;
      const data: any[] = await res.json();

      // For each memory, fetch its events
      const memoriesWithEvents = await Promise.all(
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
      setMemories(memoriesWithEvents);
    } catch (err) {
      console.error('Failed to load memories', err);
    }
  }, [getToken]);

  // ── Auth guard + initial load ───────────────────────────────────────────────

  // Track if we've done the initial load to avoid re-running on every render
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    // Load settings from user profile (only once when user first becomes available)
    if (user && !initialLoadDone.current) {
      setSettings({
        displayName: (user as any).display_name || user.username || 'User',
        theme: ((user as any).theme as UserSettings['theme']) || 'light',
      });
      initialLoadDone.current = true;
      loadMemories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  // ── Apply theme ─────────────────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // ── DnD sensors ─────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getMemoryForDate = useCallback(
    (date: Date) => memories.find((m) => isSameDay(parseISO(m.date), date)),
    [memories]
  );

  const todayMemory = getMemoryForDate(new Date());
  const currentMemory = getMemoryForDate(selectedDate);

  // ── Add event ───────────────────────────────────────────────────────────────

  const handleAddEvent = async () => {
    if (!newEvent.trim() && !audioBlob) return;
    const token = getToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const dateKey = format(new Date(), 'yyyy-MM-dd');

      // 1. Create/update memory for today
      const memRes = await fetch('/api/memories', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ date: dateKey, emotion: selectedEmotion }),
      });
      if (!memRes.ok) throw new Error('Failed to create memory');
      const memData = await memRes.json();
      const memoryId = memData.id;

      // 2. Add event
      const evRes = await fetch(`/api/memories/${memoryId}/events`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ text: newEvent.trim() || '(audio note)' }),
      });
      if (!evRes.ok) throw new Error('Failed to create event');

      setNewEvent('');
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

  // ── Drag end ────────────────────────────────────────────────────────────────

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const memory = getMemoryForDate(activeTab === 'today' ? new Date() : selectedDate);
    if (!memory) return;

    const oldIndex = memory.events.findIndex((e) => e.id === active.id);
    const newIndex = memory.events.findIndex((e) => e.id === over.id);
    const newEvents = arrayMove(memory.events, oldIndex, newIndex);

    // Optimistic update
    setMemories((prev) =>
      prev.map((m) => (m.id === memory.id ? { ...m, events: newEvents } : m))
    );

    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/memories/${memory.id}`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ action: 'reorder', eventIds: newEvents.map((e) => parseInt(e.id)) }),
      });
    } catch (err) {
      console.error('Failed to reorder events', err);
      await loadMemories();
    }
  };

  // ── Delete memory ───────────────────────────────────────────────────────────

  const handleDeleteMemory = async () => {
    if (!selectedMemory) return;
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/memories/${selectedMemory.id}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });
      setSelectedMemory(null);
      await loadMemories();
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  // ── Save settings ───────────────────────────────────────────────────────────

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    const token = getToken();
    if (!token) return;
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ displayName: newSettings.displayName, theme: newSettings.theme }),
      });
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  // ── Audio recording ─────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
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

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  // ── Loading / auth guard ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="loading-screen">
        <BookOpen size={48} className="loading-icon" />
        <p>Opening your diary…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ── Render ──────────────────────────────────────────────────────────────────

  const displayMemory = activeTab === 'today' ? todayMemory : currentMemory;

  return (
    <div className="diary-app" data-theme={settings.theme}>
      {/* ── Header ── */}
      <header className="diary-header">
        <div className="header-inner">
          <div className="header-brand">
            <BookOpen size={24} className="brand-icon" />
            <span className="brand-name">My Diary</span>
          </div>
          <nav className="header-nav">
            <button className="nav-icon-btn" onClick={() => setShowCalendar(true)} title="Calendar">
              <Calendar size={20} />
            </button>
            <button className="nav-icon-btn" onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={20} />
            </button>
            <div className="user-chip">
              <User size={16} />
              <span>{settings.displayName}</span>
            </div>
            <button className="nav-icon-btn logout-btn" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </nav>
        </div>
      </header>

      {/* ── Page ── */}
      <main className="diary-main">
        {/* Date banner */}
        <div className="date-banner">
          <p className="date-day">{format(new Date(), 'EEEE')}</p>
          <p className="date-full">{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>

        {/* Tabs */}
        <div className="tab-row">
          <button
            className={`tab-btn ${activeTab === 'today' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            Today's Entry
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Memories
          </button>
        </div>

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <div className="tab-content">
            {/* Emotion picker */}
            <section className="diary-section">
              <h2 className="section-title">How are you feeling?</h2>
              <div className="emotion-grid">
                {EMOTIONS.map((em) => (
                  <button
                    key={em.name}
                    onClick={() => setSelectedEmotion(em.name)}
                    className={`emotion-btn ${selectedEmotion === em.name ? 'emotion-btn--active' : ''}`}
                    style={
                      selectedEmotion === em.name
                        ? { background: em.color, borderColor: em.border }
                        : {}
                    }
                  >
                    <span className="em-emoji">{em.emoji}</span>
                    <span className="em-name">{em.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Write entry */}
            <section className="diary-section">
              <h2 className="section-title">Write in your diary</h2>
              <div className="diary-paper">
                <div className="paper-lines" aria-hidden="true" />
                <textarea
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  placeholder="Dear diary, today I…"
                  className="diary-textarea paper-textarea"
                  rows={6}
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
                disabled={isSaving || (!newEvent.trim() && !audioBlob)}
              >
                <Plus size={16} />
                {isSaving ? 'Saving…' : 'Save Entry'}
              </button>
            </section>

            {/* Today's events */}
            {todayMemory && todayMemory.events.length > 0 && (
              <section className="diary-section">
                <h2 className="section-title">
                  Today's entries
                  <span className="entry-count">{todayMemory.events.length}</span>
                </h2>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={todayMemory.events.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="events-list">
                      {todayMemory.events.map((ev) => (
                        <SortableEventItem
                          key={ev.id}
                          id={ev.id}
                          event={ev}
                          onDelete={(eid) => handleDeleteEvent(todayMemory.id, eid)}
                          onEdit={(eid, text) => handleEditEvent(todayMemory.id, eid, text)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
            )}
          </div>
        )}

        {/* ── PAST TAB ── */}
        {activeTab === 'past' && (
          <div className="tab-content">
            {/* Date navigation */}
            <section className="diary-section">
              <div className="date-nav">
                <button className="nav-arrow" onClick={() => setSelectedDate(subMonths(selectedDate, 1))}>
                  <ChevronLeft size={20} />
                </button>
                <div className="date-nav-center">
                  <p className="date-nav-main">{format(selectedDate, 'EEEE, MMMM d')}</p>
                  <p className="date-nav-year">{format(selectedDate, 'yyyy')}</p>
                </div>
                <button className="nav-arrow" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>

            {currentMemory ? (
              <section className="diary-section">
                <div className="memory-header">
                  {(() => {
                    const em = EMOTIONS.find((e) => e.name === currentMemory.emotion);
                    return (
                      <div
                        className="emotion-badge"
                        style={{ background: em?.color, borderColor: em?.border }}
                      >
                        <span className="emotion-emoji">{em?.emoji || '😊'}</span>
                        <span className="emotion-label capitalize">{currentMemory.emotion}</span>
                      </div>
                    );
                  })()}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedMemory(currentMemory)}
                  >
                    <Pencil size={14} /> View Full
                  </button>
                </div>

                <div className="events-list">
                  {currentMemory.events.map((ev) => (
                    <div key={ev.id} className="past-event-item">
                      <p>{ev.text}</p>
                      {(ev.audioUrl || ev.audio_url) && (
                        <audio src={ev.audioUrl || ev.audio_url} controls className="audio-player" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="diary-section empty-state">
                <BookOpen size={48} className="empty-icon" />
                <p>No entry for this date.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('today')}>
                  Write Today's Entry
                </button>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {showCalendar && (
        <div className="modal-overlay" onClick={() => setShowCalendar(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Calendar</h2>
              <button className="icon-btn" onClick={() => setShowCalendar(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="cal-nav">
              <button className="nav-arrow" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                <ChevronLeft size={18} />
              </button>
              <span className="cal-month-label">{format(calendarMonth, 'MMMM yyyy')}</span>
              <button className="nav-arrow" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                <ChevronRight size={18} />
              </button>
            </div>
            <CalendarView
              memories={memories}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setActiveTab('past');
                setShowCalendar(false);
              }}
              currentDate={calendarMonth}
            />
          </div>
        </div>
      )}

      {selectedMemory && (
        <MemoryPreview
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onDelete={handleDeleteMemory}
        />
      )}
    </div>
  );
}
