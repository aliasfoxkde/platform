import { useState, useEffect, useCallback, useRef } from 'react';
import { exists, readFile, writeFile, createDirectory } from '@/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: Priority;
  tags: string[];
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskBoard {
  tasks: Task[];
  updatedAt: string;
}

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'var(--muted-foreground)' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--accent)' },
  { id: 'done', label: 'Done', color: 'hsl(142, 71%, 45%)' },
];

const TASKS_FILE = '/Home/Tasks/board.json';

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function ensureTasksDir(): Promise<void> {
  if (!(await exists('/Home/Tasks'))) {
    await createDirectory('/Home/Tasks');
  }
}

async function loadBoard(): Promise<TaskBoard> {
  try {
    const raw = await readFile(TASKS_FILE);
    return JSON.parse(raw) as TaskBoard;
  } catch {
    return { tasks: [], updatedAt: new Date().toISOString() };
  }
}

async function saveBoard(board: TaskBoard): Promise<void> {
  board.updatedAt = new Date().toISOString();
  await writeFile(TASKS_FILE, JSON.stringify(board, null, 2));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: 'var(--muted-foreground)', icon: '↓' },
  medium: { label: 'Medium', color: 'var(--accent)', icon: '→' },
  high: { label: 'High', color: 'hsl(0, 84%, 60%)', icon: '↑' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TaskManagerApp() {
  const [board, setBoard] = useState<TaskBoard>({ tasks: [], updatedAt: '' });
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const initRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureTasksDir().then(() => {
      loadBoard().then(setBoard);
    });
  }, []);

  // Auto-save
  const persist = useCallback((newBoard: TaskBoard) => {
    setBoard(newBoard);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveBoard(newBoard), 500);
  }, []);

  const addTask = useCallback(
    (title: string, description: string = '') => {
      const task: Task = {
        id: generateId(),
        title,
        description,
        status: 'todo',
        priority: 'medium',
        tags: [],
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persist({ ...board, tasks: [task, ...board.tasks] });
      setShowNewTask(false);
    },
    [board, persist],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      persist({
        ...board,
        tasks: board.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
        ),
      });
    },
    [board, persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      persist({ ...board, tasks: board.tasks.filter((t) => t.id !== id) });
      if (editingTask?.id === id) setEditingTask(null);
    },
    [board, persist, editingTask],
  );

  const moveTask = useCallback(
    (id: string, status: Task['status']) => {
      updateTask(id, { status });
    },
    [updateTask],
  );

  const filteredTasks = board.tasks.filter((t) => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: board.tasks.length,
    todo: board.tasks.filter((t) => t.status === 'todo').length,
    inProgress: board.tasks.filter((t) => t.status === 'in-progress').length,
    done: board.tasks.filter((t) => t.status === 'done').length,
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Tasks</h2>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {stats.done}/{stats.total} done
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border border-[hsl(var(--border))]">
              <button
                onClick={() => setView('board')}
                className={`cursor-pointer px-2 py-1 text-xs transition-colors ${
                  view === 'board'
                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setView('list')}
                className={`cursor-pointer px-2 py-1 text-xs transition-colors ${
                  view === 'list'
                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                List
              </button>
            </div>

            {/* Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
              className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
            />

            {/* New task */}
            <button
              onClick={() => setShowNewTask(true)}
              className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 py-1.5">
        <div className="flex gap-1">
          {COLUMNS.map((col) => {
            const count = board.tasks.filter((t) => t.status === col.id).length;
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={col.id} className="flex-1">
                <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: col.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'board' ? (
          <BoardView
            tasks={filteredTasks}
            columns={COLUMNS}
            onMove={moveTask}
            onEdit={setEditingTask}
            onDelete={deleteTask}
          />
        ) : (
          <ListView
            tasks={filteredTasks}
            onEdit={setEditingTask}
            onDelete={deleteTask}
          />
        )}
      </div>

      {/* New task form */}
      {showNewTask && (
        <TaskForm
          onSave={addTask}
          onCancel={() => setShowNewTask(false)}
        />
      )}

      {/* Edit task form */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSave={(title, description) => {
            updateTask(editingTask.id, { title, description });
            setEditingTask(null);
          }}
          onDelete={() => {
            deleteTask(editingTask.id);
            setEditingTask(null);
          }}
          onCancel={() => setEditingTask(null)}
          onChangePriority={(p) => updateTask(editingTask.id, { priority: p })}
          onChangeDueDate={(d) => updateTask(editingTask.id, { dueDate: d })}
          onChangeStatus={(s) => updateTask(editingTask.id, { status: s })}
          currentPriority={editingTask.priority}
          currentDueDate={editingTask.dueDate}
          currentStatus={editingTask.status}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board View (Kanban)
// ---------------------------------------------------------------------------

function BoardView({
  tasks,
  columns,
  onMove,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  columns: { id: Task['status']; label: string; color: string }[];
  onMove: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full gap-3 p-3 overflow-x-auto">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="flex w-64 shrink-0 flex-col rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--border))]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-medium text-[hsl(var(--foreground))]">{col.label}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{colTasks.length}</span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {colTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
              ))}
              {colTasks.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                  No tasks
                </p>
              )}
            </div>

            {/* Quick add button at bottom */}
            {col.id !== 'done' && (
              <div className="shrink-0 border-t border-[hsl(var(--border))] p-2">
                <button
                  onClick={() => onMove('__new__', col.id)}
                  className="w-full cursor-pointer rounded-md border border-dashed border-[hsl(var(--border))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]"
                >
                  + Add task
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({
  tasks,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      {tasks.length === 0 ? (
        <p className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))]">
          No tasks found
        </p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  onEdit,
  onDelete,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const pri = PRIORITY_CONFIG[task.priority];
  return (
    <div
      className="group rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] p-2.5 cursor-pointer transition-colors hover:border-[hsl(var(--accent)/0.3)]"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[hsl(var(--foreground))] leading-snug">
          {task.title}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
          if (confirm(`Delete "${task.title}"?`)) onDelete(task.id);
        }}
          className="shrink-0 cursor-pointer rounded p-0.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[hsl(var(--destructive))]"
          title="Delete"
        >
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
          </svg>
        </button>
      </div>
      {task.description && (
        <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className="text-[10px] font-medium"
          style={{ color: pri.color }}
          title={`Priority: ${pri.label}`}
        >
          {pri.icon} {pri.label}
        </span>
        {task.dueDate && (
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {formatDate(task.dueDate)}
          </span>
        )}
        {task.tags.length > 0 && (
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {task.tags.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Form (modal)
// ---------------------------------------------------------------------------

function TaskForm({
  task,
  onSave,
  onCancel,
  onDelete,
  onChangePriority,
  onChangeDueDate,
  onChangeStatus,
  currentPriority,
  currentDueDate,
  currentStatus,
}: {
  task?: Task;
  onSave: (title: string, description: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onChangePriority?: (p: Priority) => void;
  onChangeDueDate?: (d: string | null) => void;
  onChangeStatus?: (s: Task['status']) => void;
  currentPriority?: Priority;
  currentDueDate?: string | null;
  currentStatus?: Task['status'];
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave(title.trim(), description.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {task ? 'Edit Task' : 'New Task'}
          </h3>

          <input
            ref={inputRef}
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
          />

          <textarea
            placeholder="Description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] resize-none"
          />

          {/* Extra fields when editing */}
          {task && onChangePriority && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Priority</label>
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onChangePriority(p)}
                  className={`cursor-pointer rounded-md px-2 py-1 text-xs transition-colors ${
                    currentPriority === p
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          )}

          {task && onChangeDueDate && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Due</label>
              <input
                type="date"
                value={currentDueDate ?? ''}
                onChange={(e) => onChangeDueDate(e.target.value || null)}
                className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"
              />
              {currentDueDate && (
                <button
                  onClick={() => onChangeDueDate(null)}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {task && onChangeStatus && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Status</label>
              {COLUMNS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => onChangeStatus(col.id)}
                  className={`cursor-pointer rounded-md px-2 py-1 text-xs transition-colors ${
                    currentStatus === col.id
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-1">
            {task && onDelete && (
              <button
                onClick={onDelete}
                className="cursor-pointer rounded-md px-3 py-1.5 text-xs text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
              >
                Delete
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={onCancel}
                className="cursor-pointer rounded-md border border-[hsl(var(--border))] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
