import { useState, useEffect, useCallback, useRef } from 'react';
import {
  exists,
  readFile,
  writeFile,
  createDirectory,
} from '@/storage';
import { Toolbar, ToolbarButton, TabBar, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  createdAt: string;
  lastRun?: string;
  runCount: number;
}

type AutomationTrigger =
  | { type: 'manual' }
  | { type: 'on_app_open'; appId: string }
  | { type: 'on_interval'; intervalMinutes: number }
  | { type: 'on_file_change'; path: string };

interface AutomationAction {
  type: 'open_app' | 'close_app' | 'write_file' | 'show_notification' | 'run_command';
  params: Record<string, string>;
}

interface AutomationLog {
  id: string;
  automationId: string;
  timestamp: string;
  trigger: string;
  action: string;
  result: 'success' | 'error';
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTOMATION_DIR = '/Home/Automations';
const AUTOMATIONS_FILE = `${AUTOMATION_DIR}/automations.json`;
const LOG_FILE = `${AUTOMATION_DIR}/log.json`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

function triggerLabel(trigger: AutomationTrigger): string {
  switch (trigger.type) {
    case 'manual': return 'Manual';
    case 'on_app_open': return `App: ${trigger.appId}`;
    case 'on_interval': return `Every ${trigger.intervalMinutes}m`;
    case 'on_file_change': return `File: ${trigger.path}`;
    default: return trigger.type;
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function ensureDir(): Promise<void> {
  if (!(await exists(AUTOMATION_DIR))) {
    await createDirectory(AUTOMATION_DIR);
  }
}

async function loadAutomations(): Promise<Automation[]> {
  if (!(await exists(AUTOMATIONS_FILE))) return [];
  try {
    const raw = await readFile(AUTOMATIONS_FILE);
    return JSON.parse(raw) as Automation[];
  } catch {
    return [];
  }
}

async function saveAutomations(automations: Automation[]): Promise<void> {
  await writeFile(AUTOMATIONS_FILE, JSON.stringify(automations, null, 2));
}

async function loadLog(): Promise<AutomationLog[]> {
  if (!(await exists(LOG_FILE))) return [];
  try {
    const raw = await readFile(LOG_FILE);
    return JSON.parse(raw) as AutomationLog[];
  } catch {
    return [];
  }
}

async function appendLog(entry: AutomationLog): Promise<void> {
  const log = await loadLog();
  log.unshift(entry);
  await writeFile(LOG_FILE, JSON.stringify(log.slice(0, 200), null, 2));
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const TEMPLATES: { name: string; description: string; trigger: AutomationTrigger; actions: AutomationAction[] }[] = [
  {
    name: 'Welcome Message',
    description: 'Show a welcome notification when an app opens',
    trigger: { type: 'on_app_open', appId: '' },
    actions: [{ type: 'show_notification', params: { title: 'Welcome!', body: 'App opened successfully.' } }],
  },
  {
    name: 'Auto-save Reminder',
    description: 'Periodic reminder to save your work',
    trigger: { type: 'on_interval', intervalMinutes: 30 },
    actions: [{ type: 'show_notification', params: { title: 'Reminder', body: 'Time to save your work!' } }],
  },
  {
    name: 'Open Terminal + Notes',
    description: 'Open terminal and notes together',
    trigger: { type: 'manual' },
    actions: [
      { type: 'open_app', params: { appId: 'terminal' } },
      { type: 'open_app', params: { appId: 'notes' } },
    ],
  },
  {
    name: 'Daily Briefing',
    description: 'Show a daily briefing notification',
    trigger: { type: 'on_interval', intervalMinutes: 60 },
    actions: [{ type: 'show_notification', params: { title: 'Daily Briefing', body: 'Check your tasks and calendar for today.' } }],
  },
];

// ---------------------------------------------------------------------------
// Action execution
// ---------------------------------------------------------------------------

async function executeAction(action: AutomationAction): Promise<string> {
  switch (action.type) {
    case 'open_app':
      return `Would open app: ${action.params.appId}`;
    case 'close_app':
      return `Would close app: ${action.params.appId}`;
    case 'write_file':
      return `Would write to: ${action.params.path}`;
    case 'show_notification':
      return `Notification: ${action.params.title} - ${action.params.body}`;
    case 'run_command':
      return `Would run: ${action.params.command}`;
    default:
      return `Unknown action: ${action.type}`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AutomationApp() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [log, setLog] = useState<AutomationLog[]>([]);
  const [activeTab, setActiveTab] = useState<'automations' | 'log'>('automations');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState<'manual' | 'on_app_open' | 'on_interval'>('manual');
  const [newTriggerAppId, setNewTriggerAppId] = useState('');
  const [newInterval, setNewInterval] = useState(30);
  const [newActions, setNewActions] = useState<AutomationAction[]>([]);
  const [showNew, setShowNew] = useState(false);
  const initRef = useRef(false);

  // Load on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureDir().then(async () => {
      setAutomations(await loadAutomations());
      setLog(await loadLog());
    });
  }, []);

  // Save automations on change
  useEffect(() => {
    if (!initRef.current) return;
    saveAutomations(automations);
  }, [automations]);

  // Run automation
  const runAutomation = useCallback(async (auto: Automation) => {
    const results: string[] = [];

    for (const action of auto.actions) {
      try {
        const result = await executeAction(action);
        results.push(result);
      } catch (err) {
        results.push(`Error: ${(err as Error).message}`);
      }
    }

    const logEntry: AutomationLog = {
      id: generateId(),
      automationId: auto.id,
      timestamp: new Date().toISOString(),
      trigger: triggerLabel(auto.trigger),
      action: `${auto.actions.length} action(s)`,
      result: 'success',
      message: results.join('; '),
    };

    await appendLog(logEntry);
    setLog((prev) => [logEntry, ...prev]);

    // Update run count and lastRun
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === auto.id
          ? { ...a, lastRun: new Date().toISOString(), runCount: a.runCount + 1 }
          : a,
      ),
    );
  }, []);

  // Toggle automation
  const toggleAutomation = useCallback((id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
  }, []);

  // Delete automation
  const deleteAutomation = useCallback((id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Create from template
  const createFromTemplate = useCallback((template: (typeof TEMPLATES)[number]) => {
    const newAuto: Automation = {
      id: generateId(),
      name: template.name,
      description: template.description,
      enabled: true,
      trigger: { ...template.trigger },
      actions: template.actions.map((a) => ({ ...a })),
      createdAt: new Date().toISOString(),
      runCount: 0,
    };
    setAutomations((prev) => [newAuto, ...prev]);
    setShowNew(false);
  }, []);

  // Create new automation
  const createAutomation = useCallback(() => {
    let trigger: AutomationTrigger = { type: 'manual' };
    if (newTrigger === 'on_app_open') trigger = { type: 'on_app_open', appId: newTriggerAppId };
    if (newTrigger === 'on_interval') trigger = { type: 'on_interval', intervalMinutes: newInterval };

    const newAuto: Automation = {
      id: generateId(),
      name: newName || 'New Automation',
      description: newDescription,
      enabled: true,
      trigger,
      actions: newActions,
      createdAt: new Date().toISOString(),
      runCount: 0,
    };

    setAutomations((prev) => [newAuto, ...prev]);
    setShowNew(false);
    setNewName('');
    setNewDescription('');
    setNewTrigger('manual');
    setNewTriggerAppId('');
    setNewInterval(30);
    setNewActions([]);
  }, [newName, newDescription, newTrigger, newTriggerAppId, newInterval, newActions]);

  // Start editing
  const startEdit = useCallback((auto: Automation) => {
    setEditingId(auto.id);
    setNewName(auto.name);
    setNewDescription(auto.description);
    if (auto.trigger.type === 'on_app_open') {
      setNewTrigger('on_app_open');
      setNewTriggerAppId(auto.trigger.appId);
    } else if (auto.trigger.type === 'on_interval') {
      setNewTrigger('on_interval');
      setNewInterval(auto.trigger.intervalMinutes);
    } else {
      setNewTrigger('manual');
    }
    setNewActions(auto.actions.map((a) => ({ ...a })));
  }, []);

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editingId) return;
    let trigger: AutomationTrigger = { type: 'manual' };
    if (newTrigger === 'on_app_open') trigger = { type: 'on_app_open', appId: newTriggerAppId };
    if (newTrigger === 'on_interval') trigger = { type: 'on_interval', intervalMinutes: newInterval };

    setAutomations((prev) =>
      prev.map((a) =>
        a.id === editingId
          ? { ...a, name: newName || a.name, description: newDescription, trigger, actions: newActions }
          : a,
      ),
    );
    setEditingId(null);
  }, [editingId, newName, newDescription, newTrigger, newTriggerAppId, newInterval, newActions]);

  // Add action
  const addAction = useCallback((type: string) => {
    const defaults: Record<string, Record<string, string>> = {
      open_app: { appId: '' },
      close_app: { appId: '' },
      write_file: { path: '', content: '' },
      show_notification: { title: '', body: '' },
      run_command: { command: '' },
    };
    setNewActions((prev) => [...prev, { type: type as AutomationAction['type'], params: defaults[type] ?? {} }]);
  }, []);

  const updateAction = useCallback((index: number, field: string, value: string) => {
    setNewActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, params: { ...a.params, [field]: value } } : a)),
    );
  }, []);

  const removeAction = useCallback((index: number) => {
    setNewActions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <Toolbar className="px-3 py-1.5">
        <Icon name="settings" size="sm" className="text-[hsl(var(--accent))]" />
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Automations</span>

        <div className="flex-1" />

        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
          {automations.filter((a) => a.enabled).length} active
        </span>
      </Toolbar>

      {/* Tabs */}
      <TabBar
        tabs={[
          { id: 'automations', label: `Automations (${automations.length})` },
          { id: 'log', label: `Log (${log.length})` },
        ]}
        activeTabId={activeTab}
        onTabChange={(id) => setActiveTab(id as 'automations' | 'log')}
      />

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Automations list */}
        {activeTab === 'automations' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Editor panel (shown when editing or creating) */}
            {(showNew || editingId) && (
              <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2">
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Name</label>
                    <input
                      type="text"
                      placeholder="Automation name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Description</label>
                    <input
                      type="text"
                      placeholder="What this automation does"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Trigger</label>
                    <select
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value as any)}
                      className="w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]"
                    >
                      <option value="manual">Manual</option>
                      <option value="on_app_open">When App Opens</option>
                      <option value="on_interval">On Interval</option>
                    </select>
                    {newTrigger === 'on_app_open' && (
                      <input
                        type="text"
                        placeholder="App ID (e.g., terminal)"
                        value={newTriggerAppId}
                        onChange={(e) => setNewTriggerAppId(e.target.value)}
                        className="mt-1 w-full rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
                      />
                    )}
                    {newTrigger === 'on_interval' && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Every</span>
                        <input
                          type="number"
                          min={1}
                          value={newInterval}
                          onChange={(e) => setNewInterval(parseInt(e.target.value) || 1)}
                          className="w-20 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] [color-scheme:dark]"
                        />
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">minutes</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">Actions</label>
                      <button
                        onClick={() => addAction('show_notification')}
                        className="cursor-pointer text-[9px] text-[hsl(var(--accent))] hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                    {newActions.map((action, idx) => (
                      <div key={idx} className="rounded border border-[hsl(var(--border))] p-1.5 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-[hsl(var(--accent))]">{action.type}</span>
                          <button
                            onClick={() => removeAction(idx)}
                            className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                          >
                            <Icon name="xmark" size={10} />
                          </button>
                        </div>
                        {Object.entries(action.params).map(([key, val]) => (
                          <input
                            key={key}
                            type="text"
                            placeholder={key}
                            value={val}
                            onChange={(e) => updateAction(idx, key, e.target.value)}
                            className="w-full rounded border border-[hsl(var(--border))/50] bg-[hsl(var(--background))] px-1.5 py-0.5 text-[9px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={editingId ? saveEdit : createAutomation}
                      disabled={!newName.trim()}
                      className="flex-1 cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40"
                    >
                      {editingId ? 'Save' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNew(false);
                        setEditingId(null);
                      }}
                      className="cursor-pointer rounded-md px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Automation list */}
            <div className="flex-1 overflow-y-auto p-2">
              {/* Templates */}
              {!showNew && !editingId && (
                <div className="mb-2">
                  <div className="text-[9px] font-semibold uppercase text-[hsl(var(--muted-foreground))] mb-1">Quick Start</div>
                  <div className="flex flex-wrap gap-1">
                    {TEMPLATES.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => createFromTemplate(t)}
                        className="cursor-pointer rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-[9px] text-[hsl(var(--foreground))] hover:border-[hsl(var(--accent)/0.3)]"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {automations.length === 0 && (
                <EmptyState
                  icon={<Icon name="settings" size="sm" />}
                  title="No automations"
                  description="Create one or use a template."
                  className="py-4"
                />
              )}

              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className={`mb-1 rounded-md border border-[hsl(var(--border))] p-2 transition-colors duration-100 ${!auto.enabled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runAutomation(auto)}
                      className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2 py-0.5 text-[9px] font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90 flex items-center gap-1"
                      title="Run now"
                    >
                      <Icon name="play" size={10} /> Run
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-medium text-[hsl(var(--foreground))]">{auto.name}</div>
                      <div className="flex items-center gap-2 text-[9px] text-[hsl(var(--muted-foreground))]">
                        <span className="rounded bg-[hsl(var(--surface))] px-1">{triggerLabel(auto.trigger)}</span>
                        <span>{auto.actions.length} action(s)</span>
                        {auto.runCount > 0 && <span>Ran {auto.runCount}x</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAutomation(auto.id)}
                      className={`cursor-pointer rounded p-0.5 text-[9px] ${auto.enabled ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}
                      title={auto.enabled ? 'Disable' : 'Enable'}
                    >
                      {auto.enabled ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => startEdit(auto)}
                      className="cursor-pointer rounded p-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                      title="Edit"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    <button
                      onClick={() => deleteAutomation(auto.id)}
                      className="cursor-pointer rounded p-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                      title="Delete"
                    >
                      <Icon name="xmark" size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {!showNew && !editingId && (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full mt-1 cursor-pointer rounded-md border border-dashed border-[hsl(var(--border))] px-2 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent)/0.5)] hover:text-[hsl(var(--accent))]"
                >
                  + Create Custom Automation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Log */}
        {activeTab === 'log' && (
          <div className="flex-1 overflow-y-auto p-2">
            {log.length === 0 ? (
              <EmptyState
                icon={<Icon name="clock" size="sm" />}
                title="No automation runs yet"
                className="py-4"
              />
            ) : (
              log.map((entry) => (
                <div key={entry.id} className="mb-1 rounded-md border border-[hsl(var(--border))] p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-[hsl(var(--accent))]">{entry.trigger}</span>
                    <span className={`text-[9px] ${entry.result === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.result}
                    </span>
                  </div>
                  <div className="text-[9px] text-[hsl(var(--muted-foreground))]">
                    {entry.action}
                  </div>
                  {entry.message && (
                    <div className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))] truncate">
                      {entry.message}
                    </div>
                  )}
                  <div className="mt-0.5 text-[8px] text-[hsl(var(--muted-foreground))]">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
