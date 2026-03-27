import { useState, useEffect, useCallback, useRef } from 'react';
import {
  exists,
  readFile,
  writeFile,
  createDirectory,
} from '@/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM or ''
  description: string;
  color: string;
}

type ViewMode = 'month' | 'week' | 'day';

interface FormState {
  title: string;
  date: string;
  time: string;
  description: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENTS_DIR = '/Home/Calendar';
const EVENTS_FILE = `${EVENTS_DIR}/events.json`;

const COLORS = [
  'hsl(var(--accent))',
  'hsl(220 70% 60%)',
  'hsl(340 70% 55%)',
  'hsl(160 60% 45%)',
  'hsl(30 80% 55%)',
  'hsl(270 60% 60%)',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayISO(): string {
  const d = new Date();
  return toISODate(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function addMonths(year: number, month: number, delta: number): [number, number] {
  const d = new Date(year, month, 1);
  d.setMonth(d.getMonth() + delta);
  return [d.getFullYear(), d.getMonth()];
}

function addDays(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const emptyForm = (): FormState => ({
  title: '',
  date: todayISO(),
  time: '',
  description: '',
  color: COLORS[0],
});

async function ensureEventsDir(): Promise<void> {
  if (!(await exists(EVENTS_DIR))) {
    await createDirectory(EVENTS_DIR);
  }
}

async function loadEvents(): Promise<CalendarEvent[]> {
  if (!(await exists(EVENTS_FILE))) return [];
  try {
    const raw = await readFile(EVENTS_FILE);
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

async function saveEvents(events: CalendarEvent[]): Promise<void> {
  await writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function getEventsForDate(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((e) => e.date === date);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarApp() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // Load events on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureEventsDir().then(() => loadEvents().then(setEvents));
  }, []);

  // Auto-save events
  useEffect(() => {
    if (!initRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveEvents(events);
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [events]);

  const navigateMonth = useCallback((delta: number) => {
    const [y, m] = addMonths(currentYear, currentMonth, delta);
    setCurrentYear(y);
    setCurrentMonth(m);
  }, [currentYear, currentMonth]);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(todayISO());
  }, []);

  const handleDateClick = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    if (viewMode !== 'day') {
      setViewMode('day');
    }
  }, [viewMode]);

  const openNewEvent = useCallback((date?: string) => {
    setEditingEvent(null);
    setForm({ ...emptyForm(), date: date ?? selectedDate });
    setShowForm(true);
  }, [selectedDate]);

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      date: event.date,
      time: event.time,
      description: event.description,
      color: event.color,
    });
    setShowForm(true);
    setSelectedEvent(null);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (!form.title.trim() || !form.date) return;
    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEvent.id
            ? { ...e, ...form }
            : e,
        ),
      );
    } else {
      const newEvent: CalendarEvent = { id: generateId(), ...form };
      setEvents((prev) => [...prev, newEvent]);
    }
    setShowForm(false);
    setEditingEvent(null);
    setForm(emptyForm());
  }, [form, editingEvent]);

  const handleDeleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setSelectedEvent(null);
  }, []);

  const today = todayISO();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Week view calculation
  const weekStart = viewMode === 'week'
    ? addDays(selectedDate, -new Date(selectedDate).getDay())
    : selectedDate;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
        {/* Navigation */}
        <button
          onClick={() => navigateMonth(-1)}
          className="cursor-pointer rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-xs text-[hsl(var(--foreground))]"
        >
          ←
        </button>
        <button
          onClick={goToday}
          className="cursor-pointer rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-xs text-[hsl(var(--foreground))]"
        >
          Today
        </button>
        <button
          onClick={() => navigateMonth(1)}
          className="cursor-pointer rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-xs text-[hsl(var(--foreground))]"
        >
          →
        </button>

        <span className="ml-2 text-xs font-semibold text-[hsl(var(--foreground))]">
          {MONTHS[currentMonth]} {currentYear}
        </span>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        {/* View toggle */}
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`cursor-pointer rounded-md px-2 py-1 text-xs ${
              viewMode === mode
                ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => openNewEvent()}
          className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
        >
          + New Event
        </button>
      </div>

      {/* Calendar body */}
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView
            year={currentYear}
            month={currentMonth}
            daysInMonth={daysInMonth}
            firstDay={firstDay}
            events={events}
            today={today}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onNewEvent={openNewEvent}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            weekDays={weekDays}
            events={events}
            today={today}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onEventClick={(e) => setSelectedEvent(e)}
            onNewEvent={openNewEvent}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            date={selectedDate}
            events={events}
            onEventClick={(e) => setSelectedEvent(e)}
            onNewEvent={openNewEvent}
          />
        )}

        {/* Event detail panel */}
        {selectedEvent && (
          <EventDetailPanel
            event={selectedEvent}
            onEdit={openEditEvent}
            onDelete={handleDeleteEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>

      {/* Event form modal */}
      {showForm && (
        <EventFormModal
          form={form}
          isEditing={!!editingEvent}
          colors={COLORS}
          onChange={setForm}
          onSave={handleSaveEvent}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
            setForm(emptyForm());
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------------

function MonthView({
  year,
  month,
  daysInMonth,
  firstDay,
  events,
  today,
  selectedDate,
  onDateClick,
  onNewEvent,
}: {
  year: number;
  month: number;
  daysInMonth: number;
  firstDay: number;
  events: CalendarEvent[];
  today: string;
  selectedDate: string;
  onDateClick: (date: string) => void;
  onNewEvent: (date: string) => void;
}) {
  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(...addMonths(year, month, -1));
  const cells: { day: number; date: string; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const [py, pm] = addMonths(year, month, -1);
    cells.push({ day, date: toISODate(py, pm, day), isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: toISODate(year, month, d), isCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const [ny, nm] = addMonths(year, month, 1);
    cells.push({ day: d, date: toISODate(ny, nm, d), isCurrentMonth: false });
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center text-[10px] font-medium uppercase text-[hsl(var(--muted-foreground))]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
        {cells.map((cell, i) => {
          const isToday = cell.date === today;
          const isSelected = cell.date === selectedDate;
          const dayEvents = getEventsForDate(events, cell.date);

          return (
            <div
              key={i}
              onClick={() => onDateClick(cell.date)}
              onDoubleClick={() => onNewEvent(cell.date)}
              className={`cursor-pointer border-b border-r border-[hsl(var(--border))] p-0.5 transition-colors duration-100 ${
                !cell.isCurrentMonth ? 'bg-[hsl(var(--surface)/0.3)]' : ''
              } ${isSelected ? 'bg-[hsl(var(--accent)/0.08)]' : ''}`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span
                  className={`text-[10px] leading-4 ${
                    !cell.isCurrentMonth
                      ? 'text-[hsl(var(--muted-foreground)/0.4)]'
                      : isToday
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] font-bold'
                        : 'text-[hsl(var(--foreground))]'
                  }`}
                >
                  {cell.day}
                </span>
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    onClick={(ev) => ev.stopPropagation()}
                    className="truncate rounded px-1 py-px text-[9px] leading-tight text-white"
                    style={{ backgroundColor: e.color }}
                    title={`${e.title}${e.time ? ` at ${formatTime(e.time)}` : ''}`}
                  >
                    {e.time ? `${formatTime(e.time)} ` : ''}{e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

function WeekView({
  weekDays,
  events,
  today,
  selectedDate,
  onDateClick,
  onEventClick,
  onNewEvent,
}: {
  weekDays: string[];
  events: CalendarEvent[];
  today: string;
  selectedDate: string;
  onDateClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: (date: string) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <div className="w-12 shrink-0 border-r border-[hsl(var(--border))]" />
        {weekDays.map((date) => {
          const d = fromISODate(date);
          const isToday = date === today;
          return (
            <div
              key={date}
              onClick={() => onDateClick(date)}
              className={`flex flex-1 cursor-pointer flex-col items-center py-1 ${
                date === selectedDate ? 'bg-[hsl(var(--accent)/0.1)]' : ''
              }`}
            >
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {WEEKDAYS[d.getDay()]}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isToday
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                    : 'text-[hsl(var(--foreground))]'
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour} className="flex border-b border-[hsl(var(--border))]">
            <div className="w-12 shrink-0 border-r border-[hsl(var(--border))] py-0.5 text-right pr-1.5 text-[9px] text-[hsl(var(--muted-foreground))]">
              {hour === 0 ? '' : formatTime(`${String(hour).padStart(2, '0')}:00`)}
            </div>
            {weekDays.map((date) => {
              const hourEvents = getEventsForDate(events, date).filter(
                (e) => e.time && parseInt(e.time.split(':')[0]) === hour,
              );
              return (
                <div
                  key={date}
                  onClick={() => onNewEvent(date)}
                  className="flex-1 min-h-[28px] border-r border-[hsl(var(--border))]/50 px-0.5 py-px cursor-pointer"
                >
                  {hourEvents.map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick(e);
                      }}
                      className="mb-0.5 rounded px-1 py-0.5 text-[9px] leading-tight text-white cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: e.color }}
                    >
                      {formatTime(e.time)} {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day View
// ---------------------------------------------------------------------------

function DayView({
  date,
  events,
  onEventClick,
  onNewEvent,
}: {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onNewEvent: () => void;
}) {
  const d = fromISODate(date);
  const dayEvents = getEventsForDate(events, date).sort((a, b) => a.time.localeCompare(b.time));
  const allDayEvents = dayEvents.filter((e) => !e.time);
  const timedEvents = dayEvents.filter((e) => e.time);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
        <div>
          <div className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {WEEKDAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}
          </div>
          <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {/* All-day events */}
          {allDayEvents.length > 0 && (
            <div className="border-b border-[hsl(var(--border))] px-3 py-1">
              <div className="text-[10px] font-medium uppercase text-[hsl(var(--muted-foreground))] mb-1">
                All Day
              </div>
              <div className="flex flex-wrap gap-1">
                {allDayEvents.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEventClick(e)}
                    className="cursor-pointer rounded px-2 py-0.5 text-[10px] text-white hover:opacity-80"
                    style={{ backgroundColor: e.color }}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hourly timeline */}
          {hours.map((hour) => {
            const hourEvents = timedEvents.filter(
              (e) => parseInt(e.time.split(':')[0]) === hour,
            );
            return (
              <div key={hour} className="flex border-b border-[hsl(var(--border))]">
                <div className="w-14 shrink-0 border-r border-[hsl(var(--border))] py-0.5 text-right pr-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                  {hour === 0 ? '' : formatTime(`${String(hour).padStart(2, '0')}:00`)}
                </div>
                <div
                  onClick={onNewEvent}
                  className="flex-1 min-h-[32px] px-2 py-0.5 cursor-pointer"
                >
                  {hourEvents.map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick(e);
                      }}
                      className="mb-0.5 rounded px-2 py-1 text-[10px] text-white cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: e.color }}
                    >
                      <div className="font-medium">{e.title}</div>
                      {e.description && (
                        <div className="truncate opacity-80">{e.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini sidebar with event list */}
        {dayEvents.length > 0 && (
          <aside className="w-48 shrink-0 border-l border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-y-auto p-2">
            <div className="text-[10px] font-medium uppercase text-[hsl(var(--muted-foreground))] mb-1.5">
              Events
            </div>
            {dayEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => onEventClick(e)}
                className="mb-1 w-full cursor-pointer rounded-md p-1.5 text-left transition-colors duration-100 hover:bg-[hsl(var(--muted))]"
              >
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-medium text-[hsl(var(--foreground))]">
                      {e.title}
                    </div>
                    {e.time && (
                      <div className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        {formatTime(e.time)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Detail Panel
// ---------------------------------------------------------------------------

function EventDetailPanel({
  event,
  onEdit,
  onDelete,
  onClose,
}: {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const d = fromISODate(event.date);

  return (
    <aside className="w-56 shrink-0 border-l border-[hsl(var(--border))] bg-[hsl(var(--surface))] flex flex-col">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2.5 py-1.5">
        <span className="text-[10px] font-medium uppercase text-[hsl(var(--muted-foreground))]">Event</span>
        <button
          onClick={onClose}
          className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5">
        <div
          className="mb-2 h-1 w-8 rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
          {event.title}
        </h3>
        <div className="mt-2 space-y-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-1.5">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1a6 6 0 110 12A6 6 0 018 2zm.5 3v3.293l2.354 2.353.707-.707L9.5 5.707V3h-1z" />
            </svg>
            <span>
              {WEEKDAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}, {d.getFullYear()}
              {event.time && ` at ${formatTime(event.time)}`}
            </span>
          </div>
          {event.description && (
            <div className="mt-2 whitespace-pre-wrap text-xs text-[hsl(var(--foreground))] opacity-80">
              {event.description}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-[hsl(var(--border))] p-2 flex gap-1.5">
        <button
          onClick={() => onEdit(event)}
          className="flex-1 cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(event.id)}
          className="cursor-pointer rounded-md border border-[hsl(var(--destructive)/0.3)] px-2 py-1 text-[10px] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Event Form Modal
// ---------------------------------------------------------------------------

function EventFormModal({
  form,
  isEditing,
  colors,
  onChange,
  onSave,
  onCancel,
}: {
  form: FormState;
  isEditing: boolean;
  colors: string[];
  onChange: (form: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="w-80 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[hsl(var(--border))] px-3 py-2">
          <h3 className="text-xs font-semibold text-[hsl(var(--foreground))]">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h3>
        </div>

        <div className="space-y-2.5 p-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Event title"
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            autoFocus
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />

          {/* Date & Time */}
          <div className="flex gap-2">
            <input
              type="date"
              value={form.date}
              onChange={(e) => onChange({ ...form, date: e.target.value })}
              className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]"
            />
            <input
              type="time"
              value={form.time}
              onChange={(e) => onChange({ ...form, time: e.target.value })}
              placeholder="All day"
              className="w-24 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]"
            />
          </div>

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
          />

          {/* Color picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Color</span>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onChange({ ...form, color: c })}
                className={`h-4 w-4 cursor-pointer rounded-full transition-transform duration-100 ${
                  form.color === c ? 'scale-125 ring-2 ring-[hsl(var(--foreground))]' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] px-3 py-2">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-md px-3 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!form.title.trim() || !form.date}
            className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-3 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
