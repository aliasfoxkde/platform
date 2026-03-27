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

interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHAT_DIR = '/Home/Chat';
const CONVERSATIONS_FILE = `${CHAT_DIR}/conversations.json`;
const MESSAGES_PREFIX = `${CHAT_DIR}/messages-`;
const MESSAGES_SUFFIX = '.json';
const DEFAULT_SENDER = 'You';

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'] },
  { name: 'Gestures', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','💪'] },
  { name: 'Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟'] },
  { name: 'Objects', emojis: ['⭐','🌟','✨','⚡','🔥','💫','🎵','🎶','✅','❌','⚠️','💬','💭','🗯️','📎','🔗','🔒','🔑','💡','📌','🎯'] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function ensureChatDir(): Promise<void> {
  if (!(await exists(CHAT_DIR))) {
    await createDirectory(CHAT_DIR);
  }
}

async function loadConversations(): Promise<Conversation[]> {
  if (!(await exists(CONVERSATIONS_FILE))) return [];
  try {
    const raw = await readFile(CONVERSATIONS_FILE);
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

async function saveConversations(conversations: Conversation[]): Promise<void> {
  await writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2));
}

async function loadMessages(conversationId: string): Promise<Message[]> {
  const path = `${MESSAGES_PREFIX}${conversationId}${MESSAGES_SUFFIX}`;
  if (!(await exists(path))) return [];
  try {
    const raw = await readFile(path);
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

async function saveMessages(conversationId: string, messages: Message[]): Promise<void> {
  const path = `${MESSAGES_PREFIX}${conversationId}${MESSAGES_SUFFIX}`;
  await writeFile(path, JSON.stringify(messages, null, 2));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [newConvName, setNewConvName] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load conversations on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureChatDir().then(async () => {
      const convs = await loadConversations();
      setConversations(convs);
      if (convs.length > 0) {
        const lastActive = convs[0].id;
        setActiveConversationId(lastActive);
        const msgs = await loadMessages(lastActive);
        setMessages(msgs);
      }
    });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-save conversations (debounced)
  useEffect(() => {
    if (!initRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveConversations(conversations);
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [conversations]);

  // Create new conversation
  const createConversation = useCallback(async (name: string) => {
    const id = generateId();
    const now = Date.now();
    const conv: Conversation = {
      id,
      name: name || `Chat ${conversations.length + 1}`,
      lastMessage: '',
      lastTimestamp: now,
      unread: 0,
    };
    const updated = [conv, ...conversations];
    setConversations(updated);
    setActiveConversationId(id);
    setMessages([]);
    setShowNewConv(false);
    setNewConvName('');
    await saveConversations(updated);
  }, [conversations]);

  // Switch conversation
  const switchConversation = useCallback(async (id: string) => {
    // Save current messages first
    if (activeConversationId && messages.length > 0) {
      await saveMessages(activeConversationId, messages);
    }

    // Clear unread
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    );

    setActiveConversationId(id);
    const msgs = await loadMessages(id);
    setMessages(msgs);
    inputRef.current?.focus();
  }, [activeConversationId, messages]);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);

    if (activeConversationId === id) {
      if (updated.length > 0) {
        const next = updated[0].id;
        setActiveConversationId(next);
        const msgs = await loadMessages(next);
        setMessages(msgs);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
    }

    await saveConversations(updated);
  }, [activeConversationId, conversations]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeConversationId) return;

    const msg: Message = {
      id: generateId(),
      conversationId: activeConversationId,
      sender: DEFAULT_SENDER,
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    const newMessages = [...messages, msg];
    setMessages(newMessages);
    setInput('');
    setShowEmoji(false);

    // Save messages
    await saveMessages(activeConversationId, newMessages);

    // Update conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, lastMessage: msg.content, lastTimestamp: msg.timestamp }
          : c,
      ),
    );

    // Simulate reply after a short delay
    setTimeout(async () => {
      const replies = [
        'That sounds interesting!',
        'I understand what you mean.',
        'Good point! Let me think about that.',
        'Thanks for sharing!',
        'Sure, I can help with that.',
        'Interesting perspective.',
        'Let me look into that for you.',
        'That makes sense.',
        'I appreciate the context.',
        'Got it, noted!',
      ];

      const reply: Message = {
        id: generateId(),
        conversationId: activeConversationId,
        sender: 'Assistant',
        content: replies[Math.floor(Math.random() * replies.length)],
        timestamp: Date.now(),
        type: 'text',
      };

      const updatedMessages = await loadMessages(activeConversationId);
      const allMessages = [...updatedMessages, reply];
      await saveMessages(activeConversationId, allMessages);

      if (activeConversationId) {
        setMessages((prev) => [...prev, reply]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? { ...c, lastMessage: reply.content, lastTimestamp: reply.timestamp }
              : c,
          ),
        );
      }
    }, 800 + Math.random() * 1200);
  }, [input, activeConversationId, messages]);

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  // Filtered conversations
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : conversations;

  // Group conversations by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayConvs = filteredConversations.filter((c) => c.lastTimestamp >= today.getTime());
  const yesterdayConvs = filteredConversations.filter((c) => c.lastTimestamp >= yesterday.getTime() && c.lastTimestamp < today.getTime());
  const thisWeekConvs = filteredConversations.filter((c) => c.lastTimestamp >= weekAgo.getTime() && c.lastTimestamp < yesterday.getTime());
  const olderConvs = filteredConversations.filter((c) => c.lastTimestamp < weekAgo.getTime());

  return (
    <div className="flex h-full w-full overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="flex w-60 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
          {/* Search */}
          <div className="p-2 border-b border-[hsl(var(--border))]">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
            />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {renderGroup('Today', todayConvs, activeConversationId, switchConversation, deleteConversation)}
            {renderGroup('Yesterday', yesterdayConvs, activeConversationId, switchConversation, deleteConversation)}
            {renderGroup('This Week', thisWeekConvs, activeConversationId, switchConversation, deleteConversation)}
            {renderGroup('Older', olderConvs, activeConversationId, switchConversation, deleteConversation)}

            {filteredConversations.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                {searchQuery ? 'No matches' : 'No conversations yet'}
              </p>
            )}
          </div>

          {/* New conversation */}
          <div className="border-t border-[hsl(var(--border))] p-2">
            {showNewConv ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Name..."
                  value={newConvName}
                  onChange={(e) => setNewConvName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createConversation(newConvName);
                    if (e.key === 'Escape') setShowNewConv(false);
                  }}
                  className="flex-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
                  autoFocus
                />
                <button
                  onClick={() => createConversation(newConvName)}
                  className="cursor-pointer rounded bg-[hsl(var(--accent))] px-2 py-1 text-[9px] text-[hsl(var(--accent-foreground))] hover:opacity-90"
                >
                  OK
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewConv(true)}
                className="w-full cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90"
              >
                + New Chat
              </button>
            )}
          </div>
        </aside>
      )}

      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Chat header */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="cursor-pointer rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z" />
            </svg>
          </button>
          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
            {activeConversationId
              ? conversations.find((c) => c.id === activeConversationId)?.name
              : 'Select a conversation'}
          </span>
          {activeConversationId && (
            <button
              onClick={() => deleteConversation(activeConversationId)}
              className="ml-auto cursor-pointer rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
              title="Delete conversation"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H5.5l1-1h3l1 1h2.5a1 1 0 011 1v1z" />
              </svg>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!activeConversationId && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-30">💬</div>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Start a new conversation or select one
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isOwn = msg.sender === DEFAULT_SENDER;
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const showSender = !prevMsg || prevMsg.sender !== msg.sender;
            const showTimestamp = !prevMsg || msg.timestamp - prevMsg.timestamp > 300000;

            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <span className="rounded-full bg-[hsl(var(--surface))] px-2.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))]">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showTimestamp ? 'mt-2' : 'mt-0.5'}`}
              >
                <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                  {showSender && (
                    <div className={`mb-0.5 text-[9px] ${isOwn ? 'text-right text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                      {msg.sender}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-1.5 text-xs leading-relaxed ${
                      isOwn
                        ? 'rounded-br-md bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                        : 'rounded-bl-md bg-[hsl(var(--surface-bright))] text-[hsl(var(--foreground))]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {showTimestamp && (
                    <div className={`mt-0.5 text-[8px] text-[hsl(var(--muted-foreground)/0.6)] ${isOwn ? 'text-right' : ''}`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji picker */}
        {showEmoji && (
          <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
        )}

        {/* Input */}
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-2">
          <div className="flex items-end gap-1.5">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="cursor-pointer rounded-md p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
              title="Emoji"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108-1.5 4.5 4.5 0 00-1.065 0 .75.75 0 10-1.5 0 5.5 5.5 0 107-1 1 0 00-1 1z" />
              </svg>
            </button>
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={activeConversationId ? 'Type a message...' : 'Select a conversation...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={!activeConversationId}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] disabled:opacity-50"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !activeConversationId}
              className="cursor-pointer rounded-md bg-[hsl(var(--accent))] p-1.5 text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15.854.146a.5.5 0 01-.523.77l-3.983 2.443a.75.75 0 01-.836-.035l-2.792-2.084a.5.5 0 01.6-.8l2.492 1.86 3.596-2.21a.5.5 0 01.846.46z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation group
// ---------------------------------------------------------------------------

function renderGroup(
  label: string,
  convs: Conversation[],
  activeId: string | null,
  onSwitch: (id: string) => void,
  onDelete: (id: string) => void,
) {
  if (convs.length === 0) return null;

  return (
    <div key={label}>
      <div className="px-2 py-1 text-[9px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
        {label}
      </div>
      {convs.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSwitch(conv.id)}
          className={`group flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors duration-100 ${
            conv.id === activeId
              ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
              : 'text-[hsl(var(--surface-foreground))] hover:bg-[hsl(var(--muted))]'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="truncate text-xs font-medium">{conv.name}</div>
            {conv.lastMessage && (
              <div className="truncate text-[9px] text-[hsl(var(--muted-foreground))]">
                {conv.lastMessage}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {conv.unread > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--accent))] text-[8px] text-[hsl(var(--accent-foreground))]">
                {conv.unread}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="hidden group-hover:block cursor-pointer rounded p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
              >
              ×
            </button>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Emoji Picker
// ---------------------------------------------------------------------------

function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      {/* Category tabs */}
      <div className="flex border-b border-[hsl(var(--border))] px-1 py-0.5">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            className={`cursor-pointer rounded px-1.5 py-0.5 text-xs ${i === activeCategory ? 'bg-[hsl(var(--accent)/0.15)]' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            {cat.emojis[0]}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          ×
        </button>
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-10 gap-0.5 p-1 max-h-32 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory]?.emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="cursor-pointer rounded p-0.5 text-base hover:bg-[hsl(var(--muted))]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
