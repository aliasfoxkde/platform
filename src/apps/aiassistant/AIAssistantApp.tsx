import { useState, useCallback, useRef, useEffect } from 'react';
import {
  readFile,
  writeFile,
  listDirectory,
  exists,
} from '@/storage';
import {
  generateToolDefinitions,
  generateSystemPrompt,
  gatherContext,
  executeToolCall,
} from '@/capabilities/ai/toolSchema';
import type { ToolDefinition } from '@/capabilities/ai/toolSchema';
import { Toolbar, ToolbarButton, EmptyState, TabBar } from '@/ui/components';
import { Icon } from '@/ui/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCall?: { name: string; args: Record<string, unknown> };
  toolResult?: string;
  timestamp: number;
}

interface AIConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_DIR = '/Home/AI';
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;
const HISTORY_FILE = `${CONFIG_DIR}/history.json`;

const DEFAULT_CONFIG: AIConfig = {
  endpoint: '',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureConfigDir(): Promise<void> {
  if (!(await exists(CONFIG_DIR))) {
    const { createDirectory } = await import('@/storage');
    await createDirectory(CONFIG_DIR);
  }
}

async function loadConfig(): Promise<AIConfig> {
  if (!(await exists(CONFIG_FILE))) return { ...DEFAULT_CONFIG };
  try {
    const raw = await readFile(CONFIG_FILE);
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(config: AIConfig): Promise<void> {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function loadHistory(): Promise<ChatMessage[]> {
  if (!(await exists(HISTORY_FILE))) return [];
  try {
    const raw = await readFile(HISTORY_FILE);
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

async function saveHistory(messages: ChatMessage[]): Promise<void> {
  await writeFile(HISTORY_FILE, JSON.stringify(messages.slice(-100), null, 2));
}

// ---------------------------------------------------------------------------
// OpenAI-compatible API call
// ---------------------------------------------------------------------------

async function callAI(
  config: AIConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  tools: ToolDefinition[],
): Promise<{ content: string; toolCalls?: { name: string; args: Record<string, unknown> }[] }> {
  if (!config.endpoint || !config.apiKey) {
    return { content: 'No API endpoint or key configured. Go to Settings to set up your AI provider.' };
  }

  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages
      .filter((m) => m.role !== 'tool')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  ];

  const body: Record<string, unknown> = {
    model: config.model,
    messages: apiMessages,
    max_tokens: 4096,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];

  if (!choice) {
    return { content: 'No response from API.' };
  }

  const message = choice.message;

  // Check for tool calls
  if (message.tool_calls?.length > 0) {
    return {
      content: message.content ?? '',
      toolCalls: message.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || '{}'),
      })),
    };
  }

  return { content: message.content ?? '' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIAssistantApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [showToolSchema, setShowToolSchema] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'tools' | 'settings'>('chat');
  const [contextInfo, setContextInfo] = useState<string>('');
  const [toolDefs, setToolDefs] = useState<ToolDefinition[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load config and history on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureConfigDir().then(async () => {
      const cfg = await loadConfig();
      setConfig(cfg);
      const hist = await loadHistory();
      if (hist.length > 0) {
        setMessages(hist);
      }
    });
  }, []);

  // Generate tool definitions and context
  useEffect(() => {
    try {
      const ctx = gatherContext();
      setToolDefs(generateToolDefinitions());
      setContextInfo(
        `Apps: ${ctx.openApps.join(', ') || 'none'} | Windows: ${ctx.openWindows.length} | Capabilities: ${ctx.capabilities.join(', ')}`,
      );
    } catch {
      // Module not available
    }
  }, [messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save history (debounced)
  useEffect(() => {
    if (!initRef.current || messages.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveHistory(messages), 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages]);

  // Save config
  const handleSaveConfig = useCallback(async (newConfig: AIConfig) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build system prompt
      let systemPrompt = generateSystemPrompt(gatherContext());

      // Add context about open files
      if (userMsg.content.toLowerCase().includes('file') || userMsg.content.toLowerCase().includes('read')) {
        try {
          const entries = await listDirectory('/Home').catch(() => []);
          const fileList = entries.filter((e) => e.type === 'file').map((e) => e.name).join(', ');
          if (fileList) {
            systemPrompt += `\n\nFiles in /Home: ${fileList}`;
          }
        } catch { /* ignore */ }
      }

      // Call AI
      const result = await callAI(config, systemPrompt, updatedMessages, toolDefs);

      // Handle tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.content || `Calling ${result.toolCalls.length} tool(s)...`,
          timestamp: Date.now(),
        };
        const withAssistant = [...updatedMessages, assistantMsg];
        setMessages(withAssistant);

        // Execute each tool call
        for (const tc of result.toolCalls) {
          const toolResult = await executeToolCall(tc.name, tc.args);

          const toolMsg: ChatMessage = {
            id: generateId(),
            role: 'tool',
            content: `Tool: ${tc.name}`,
            toolCall: tc,
            toolResult,
            timestamp: Date.now(),
          };
          withAssistant.push(toolMsg);
          setMessages([...withAssistant]);
        }

        // Get AI response after tool execution
        const followUp = await callAI(config, systemPrompt, [...withAssistant], toolDefs);
        const followMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: followUp.content,
          timestamp: Date.now(),
        };
        setMessages([...withAssistant, followMsg]);
      } else {
        const assistantMsg: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.content,
          timestamp: Date.now(),
        };
        setMessages([...updatedMessages, assistantMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: 'system',
        content: `Error: ${(err as Error).message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, config, toolDefs]);

  // Clear chat
  const handleClear = useCallback(async () => {
    setMessages([]);
    await saveHistory([]);
  }, []);

  // Format JSON in messages
  const formatMessage = (content: string): string => {
    // Render tool results as code blocks
    return content
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[hsl(var(--surface))] rounded p-2 my-1 text-[10px] overflow-x-auto font-mono">$2</pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-[hsl(var(--surface))] rounded px-1 text-[10px] font-mono">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <Toolbar className="px-3 py-1.5">
        <Icon name="info" size="sm" className="text-[hsl(var(--accent))]" />
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">AI Assistant</span>
        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{contextInfo}</span>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => setActiveTab('tools')}
          active={activeTab === 'tools'}
          title="Tools"
        >
          <span className="text-[9px]">Tools ({toolDefs.length})</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setActiveTab('settings')}
          active={activeTab === 'settings'}
          title="Settings"
        >
          <Icon name="settings" size="sm" />
        </ToolbarButton>
        <ToolbarButton onClick={handleClear} title="Clear chat">
          <Icon name="trash" size="sm" />
        </ToolbarButton>
      </Toolbar>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="flex flex-1 flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={<Icon name="info" size="lg" />}
                    title="AI Assistant"
                    description="AI assistant with tool use. Configure your API provider in Settings to get started."
                  />
                </div>
              )}

              {messages.map((msg) => {
                if (msg.role === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center py-1">
                      <span className="rounded-full bg-[hsl(var(--surface))] px-2.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                const isUser = msg.role === 'user';
                const isTool = msg.role === 'tool';

                return (
                  <div
                    key={msg.id}
                    className={`mb-2 ${isTool ? 'ml-8' : ''}`}
                  >
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 ${
                          isUser
                            ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-br-sm'
                            : isTool
                              ? 'bg-[hsl(var(--surface-bright))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                              : 'bg-[hsl(var(--surface-bright))] text-[hsl(var(--foreground))] rounded-bl-sm'
                        }`}
                      >
                        {isTool && msg.toolCall && (
                          <div className="mb-1 flex items-center gap-1 text-[9px]">
                            <Icon name="info" size={12} className="text-[hsl(var(--accent))]" />
                            <span className="font-mono text-[hsl(var(--accent))]">{msg.toolCall.name}</span>
                          </div>
                        )}
                        <div
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                        />
                        {isTool && msg.toolResult && (
                          <details className="mt-1.5">
                            <summary className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                              View result
                            </summary>
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-[hsl(var(--background))] p-1.5 text-[9px] font-mono text-[hsl(var(--foreground))]">
                              {msg.toolResult.length > 500 ? msg.toolResult.slice(0, 500) + '...' : msg.toolResult}
                            </pre>
                          </details>
                        )}
                        <div className={`mt-1 text-[8px] ${isUser ? 'text-right' : ''} text-[hsl(var(--muted-foreground)/0.6)]`}>
                          {formatTime(msg.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 py-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--accent))]" />
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2">
              <div className="flex items-end gap-1.5">
                <div className="flex-1">
                  <textarea
                    ref={inputRef as any}
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={loading}
                    rows={1}
                    className="w-full resize-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] disabled:opacity-50"
                    style={{ minHeight: '36px', maxHeight: '100px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="cursor-pointer rounded-md bg-[hsl(var(--accent))] p-2 text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40"
                >
                  <Icon name="send" size="sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tools tab */}
        {activeTab === 'tools' && (
          <ToolSchemaView tools={toolDefs} />
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <SettingsView config={config} onSave={handleSaveConfig} onBack={() => setActiveTab('chat')} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Schema View
// ---------------------------------------------------------------------------

function ToolSchemaView({ tools }: { tools: ToolDefinition[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="mb-2 text-xs font-semibold text-[hsl(var(--foreground))]">
        Registered Tools ({tools.length})
      </div>
      <p className="mb-3 text-[10px] text-[hsl(var(--muted-foreground))]">
        These tools are available to the AI via function calling (OpenAI-compatible format).
      </p>
      {tools.length === 0 ? (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">No capabilities registered with commands.</p>
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <div key={tool.function.name} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2">
              <div className="font-mono text-[10px] font-semibold text-[hsl(var(--accent))]">
                {tool.function.name}
              </div>
              <div className="mt-0.5 text-[10px] text-[hsl(var(--foreground))]">
                {tool.function.description}
              </div>
              {Object.keys(tool.function.parameters.properties).length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  <div className="text-[9px] text-[hsl(var(--muted-foreground))]">Parameters:</div>
                  {Object.entries(tool.function.parameters.properties).map(([name, prop]: [string, any]) => (
                    <div key={name} className="flex gap-1 text-[9px]">
                      <span className="font-mono text-[hsl(var(--accent))]">{name}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">{(prop as any).type}</span>
                      {(prop as any).description && (
                        <span className="text-[hsl(var(--muted-foreground/0.7)]">— {(prop as any).description}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings View
// ---------------------------------------------------------------------------

function SettingsView({
  config,
  onSave,
  onBack,
}: {
  config: AIConfig;
  onSave: (config: AIConfig) => void;
  onBack: () => void;
}) {
  const [local, setLocal] = useState(config);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] px-3 py-1.5">
        <button onClick={onBack} className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] flex items-center gap-1">
          <Icon name="chevron-left" size="sm" />
          <span className="text-xs">Back</span>
        </button>
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">AI Provider Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div>
          <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
            API Endpoint
          </label>
          <input
            type="text"
            placeholder="https://api.openai.com/v1/chat/completions"
            value={local.endpoint}
            onChange={(e) => setLocal({ ...local, endpoint: e.target.value })}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
          />
          <p className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">
            OpenAI-compatible chat completions endpoint (e.g., OpenAI, Anthropic proxy, local LLM)
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
            API Key
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={local.apiKey}
            onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
          />
          <p className="mt-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">
            Stored locally in VFS, never sent to any server except the configured endpoint
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
            Model
          </label>
          <input
            type="text"
            placeholder="gpt-4o"
            value={local.model}
            onChange={(e) => setLocal({ ...local, model: e.target.value })}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
          />
        </div>

        <button
          onClick={() => onSave(local)}
          className="w-full cursor-pointer rounded-md bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
