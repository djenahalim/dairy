'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// Types
interface Event {
  id: string;
  text: string;
  audioBlob?: Blob;
  audioUrl?: string;
}

interface Memory {
  id: string;
  date: string;
  emotion: string;
  events: Event[];
  createdAt: string;
  updatedAt: string;
}

interface UserSettings {
  displayName: string;
  theme: 'light' | 'dark' | 'purple';
}

const EMOTIONS = [
  { emoji: '😊', name: 'happy', color: 'bg-yellow-100 border-yellow-400' },
  { emoji: '😢', name: 'sad', color: 'bg-blue-100 border-blue-400' },
  { emoji: '😠', name: 'angry', color: 'bg-red-100 border-red-400' },
  { emoji: '🤩', name: 'excited', color: 'bg-orange-100 border-orange-400' },
  { emoji: '😌', name: 'calm', color: 'bg-green-100 border-green-400' },
  { emoji: '😰', name: 'anxious', color: 'bg-purple-100 border-purple-400' },
];

// Sortable Event Item Component
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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

  const toggleAudio = () => {
    if (eventItem.audioUrl && audioRef.current) {
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
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-gray-800 dark:text-gray-200">{eventItem.text}</p>
          )}
          {eventItem.audioUrl && (
            <div className="mt-2 flex items-center gap-2">
              <audio
                ref={audioRef}
                src={eventItem.audioUrl}
                onEnded={() => setIsPlaying(false)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAudio}
                className="h-6"
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <span className="text-xs text-gray-500">Audio note</span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(id)}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Memory Preview Component
function MemoryPreview({
  memory,
  onClose,
  onDelete,
}: {
  memory: Memory;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Memory from {format(parseISO(memory.date), 'EEEE, MMMM d, yyyy')}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {memory.events.length} event{memory.events.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <span className="text-4xl">
                {EMOTIONS.find((e) => e.name === memory.emotion)?.emoji || '😊'}
              </span>
              <span className="text-lg capitalize">{memory.emotion}</span>
            </div>
          </div>
          <div className="space-y-3">
            {memory.events.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <p>{event.text}</p>
                {event.audioUrl && (
                  <div className="mt-2">
                    <audio src={event.audioUrl} controls className="h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Memory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Calendar Component
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

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const hasMemory = (date: Date) => {
    return memories.some((m) => isSameDay(parseISO(m.date), date));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date >= monthStart && date <= monthEnd;
          const hasMemoryOnDay = hasMemory(date);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={index}
              onClick={() => onDateSelect(date)}
              className={`
                aspect-square p-1 text-sm rounded-lg transition-colors
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                ${hasMemoryOnDay ? 'bg-green-500 text-white hover:bg-green-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                ${isToday && !hasMemoryOnDay ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Settings Modal
function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [theme, setTheme] = useState<UserSettings['theme']>(settings.theme);

  const handleSave = () => {
    onSave({ displayName, theme });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {(['light', 'dark', 'purple'] as const).map((t) => (
                <Button
                  key={t}
                  variant={theme === t ? 'default' : 'outline'}
                  onClick={() => setTheme(t)}
                  className="capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Component
export default function DairyApp() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'today' | 'past'>('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [emotions, setEmotions] = useState<{ [key: string]: string }>({});
  const [newEvent, setNewEvent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    displayName: 'User',
    theme: 'light',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load data from localStorage
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    const savedMemories = localStorage.getItem('dairy-memories');
    if (savedMemories) {
      setMemories(JSON.parse(savedMemories));
    }

    const savedSettings = localStorage.getItem('dairy-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [isAuthenticated, isLoading, router]);

  // Save memories to localStorage
  useEffect(() => {
    if (memories.length > 0) {
      localStorage.setItem('dairy-memories', JSON.stringify(memories));
    }
  }, [memories]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('dairy-settings', JSON.stringify(settings));
    document.documentElement.className = settings.theme;
  }, [settings]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getMemoryForDate = useCallback(
    (date: Date) => {
      return memories.find((m) => isSameDay(parseISO(m.date), date));
    },
    [memories]
  );

  const handleEmotionSelect = (emotion: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setEmotions((prev) => ({ ...prev, [dateKey]: emotion }));
  };

  const handleAddEvent = () => {
    if (!newEvent.trim() && !audioBlob) return;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newEventObj: Event = {
      id: Date.now().toString(),
      text: newEvent.trim(),
      audioBlob: audioBlob || undefined,
    };

    const existingMemory = getMemoryForDate(selectedDate);
    if (existingMemory) {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === existingMemory.id
            ? { ...m, events: [...m.events, newEventObj], updatedAt: new Date().toISOString() }
            : m
        )
      );
    } else {
      const newMemory: Memory = {
        id: Date.now().toString(),
        date: dateKey,
        emotion: emotions[dateKey] || 'happy',
        events: [newEventObj],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setMemories((prev) => [...prev, newMemory]);
    }

    setNewEvent('');
    setAudioBlob(null);
  };

  const handleDeleteEvent = (memoryId: string, eventId: string) => {
    setMemories((prev) =>
      prev
        .map((m) =>
          m.id === memoryId
            ? { ...m, events: m.events.filter((e) => e.id !== eventId), updatedAt: new Date().toISOString() }
            : m
        )
        .filter((m) => m.events.length > 0)
    );
  };

  const handleEditEvent = (memoryId: string, eventId: string, newText: string) => {
    setMemories((prev) =>
      prev.map((m) =>
        m.id === memoryId
          ? {
              ...m,
              events: m.events.map((e) =>
                e.id === eventId ? { ...e, text: newText } : e
              ),
              updatedAt: new Date().toISOString(),
            }
          : m
      )
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const memory = getMemoryForDate(selectedDate);
      if (memory) {
        const oldIndex = memory.events.findIndex((e) => e.id === active.id);
        const newIndex = memory.events.findIndex((e) => e.id === over.id);
        const newEvents = arrayMove(memory.events, oldIndex, newIndex);

        setMemories((prev) =>
          prev.map((m) =>
            m.id === memory.id
              ? { ...m, events: newEvents, updatedAt: new Date().toISOString() }
              : m
          )
        );
      }
    }
  };

  const handleDeleteMemory = () => {
    if (selectedMemory) {
      setMemories((prev) => prev.filter((m) => m.id !== selectedMemory.id));
      setSelectedMemory(null);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentMemory = getMemoryForDate(selectedDate);

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900">
        {/* Header */}
        <header className="bg-white/20 backdrop-blur-sm shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Dairy App</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCalendar(true)}
                className="text-white hover:bg-white/20"
              >
                <Calendar className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-white">
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{settings.displayName}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'today' ? 'default' : 'outline'}
              onClick={() => setActiveTab('today')}
              className={activeTab === 'today' ? 'bg-white text-purple-600' : 'text-white border-white hover:bg-white/20'}
            >
              Today's Entry
            </Button>
            <Button
              variant={activeTab === 'past' ? 'default' : 'outline'}
              onClick={() => setActiveTab('past')}
              className={activeTab === 'past' ? 'bg-white text-purple-600' : 'text-white border-white hover:bg-white/20'}
            >
              Past Memory
            </Button>
          </div>

          {/* Today's Entry Tab */}
          {activeTab === 'today' && (
            <div className="space-y-6">
              {/* Emotion Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>How are you feeling today?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {EMOTIONS.map((emotion) => (
                      <button
                        key={emotion.name}
                        onClick={() => handleEmotionSelect(emotion.name)}
                        className={`
                          p-4 rounded-lg border-2 transition-all
                          ${emotions[format(new Date(), 'yyyy-MM-dd')] === emotion.name
                            ? emotion.color + ' border-current scale-105'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                          }
                        `}
                      >
                        <div className="text-3xl mb-1">{emotion.emoji}</div>
                        <div className="text-sm capitalize">{emotion.name}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Add Event */}
              <Card>
                <CardHeader>
                  <CardTitle>Add an Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-input">What happened today?</Label>
                    <textarea
                      id="event-input"
                      value={newEvent}
                      onChange={(e) => setNewEvent(e.target.value)}
                      placeholder="Write about your day..."
                      className="w-full min-h-[120px] p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {isRecording && (
                    <div className="flex items-center gap-2 text-red-500">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span>Recording...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopRecording}
                        className="ml-auto"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                    </div>
                  )}

                  {!isRecording && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={startRecording}
                        disabled={isRecording}
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Record Audio
                      </Button>
                      {audioBlob && (
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="text-sm">Audio recorded</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAudioBlob(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={handleAddEvent} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </CardContent>
              </Card>

              {/* Events List */}
              {currentMemory && currentMemory.events.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Events ({currentMemory.events.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={currentMemory.events.map((e) => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {currentMemory.events.map((event) => (
                            <SortableEventItem
                              key={event.id}
                              id={event.id}
                              event={event}
                              onDelete={(eventId) =>
                                handleDeleteEvent(currentMemory.id, eventId)
                              }
                              onEdit={(eventId, text) =>
                                handleEditEvent(currentMemory.id, eventId, text)
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Past Memory Tab */}
          {activeTab === 'past' && (
            <div className="space-y-6">
              {/* Date Navigation */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <div className="font-semibold">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {isSameDay(selectedDate, new Date())
                          ? 'Today'
                          : format(selectedDate, 'MMMM d, yyyy')}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Memory Content */}
              {currentMemory ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">
                            {EMOTIONS.find((e) => e.name === currentMemory.emotion)?.emoji || '😊'}
                          </span>
                          <CardTitle className="capitalize">
                            {currentMemory.emotion}
                          </CardTitle>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMemory(currentMemory)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          View Memory
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentMemory.events.map((event) => (
                          <div
                            key={event.id}
                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <p>{event.text}</p>
                            {event.audioUrl && (
                              <audio src={event.audioUrl} controls className="mt-2 h-8" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No memory recorded for this date.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab('today')}
                    >
                      Go to Today's Entry
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </main>

        {/* Modals */}
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSave={setSettings}
        />

        {showCalendar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Calendar</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCalendar(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
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
              </CardContent>
            </Card>
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
    </div>
  );
}