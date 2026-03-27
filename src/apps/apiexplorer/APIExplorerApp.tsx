import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface Header {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiRequest {
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: number;
}

interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  duration: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

const HISTORY_KEY = 'webos-api-history';
const MAX_HISTORY = 50;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function APIExplorerApp() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Header[]>([
    { id: '1', key: 'Content-Type', value: 'application/json', enabled: true },
    { id: '2', key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [bodyFormat, setBodyFormat] = useState<'json' | 'text' | 'form'>('json');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  const abortRef = useRef<AbortController | null>(null);

  const addHeader = useCallback(() => {
    setHeaders((prev) => [
      ...prev,
      { id: generateId(), key: '', value: '', enabled: true },
    ]);
  }, []);

  const removeHeader = useCallback((id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHeader = useCallback((id: string, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)),
    );
  }, []);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;

    setLoading(true);
    setResponse(null);
    abortRef.current = new AbortController();

    const startTime = performance.now();

    try {
      const reqHeaders: Record<string, string> = {};
      for (const h of headers) {
        if (h.enabled && h.key.trim()) {
          reqHeaders[h.key.trim()] = h.value;
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: reqHeaders,
        signal: abortRef.current.signal,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        fetchOptions.body = body;
      }

      const res = await fetch(url, fetchOptions);
      const duration = performance.now() - startTime;
      const resBody = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        resHeaders[key] = val;
      });

      const resp: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        duration,
        size: new Blob([resBody]).size,
      };

      setResponse(resp);

      const entry: HistoryEntry = {
        id: generateId(),
        method,
        url,
        status: res.status,
        duration,
        timestamp: Date.now(),
      };
      const newHistory = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      const duration = performance.now() - startTime;

      if ((err as Error).name === 'AbortError') {
        setResponse({
          status: 0,
          statusText: 'Aborted',
          headers: {},
          body: 'Request was cancelled',
          duration,
          size: 0,
        });
      } else {
        setResponse({
          status: 0,
          statusText: 'Error',
          headers: {},
          body: (err as Error).message,
          duration,
          size: 0,
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [url, method, headers, body, history]);

  const cancelRequest = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url);
    setShowHistory(false);
  }, []);

  const tryFormatJson = useCallback((str: string): string => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  }, []);

  const formattedBody = response ? tryFormatJson(response.body) : '';

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* URL Bar */}
      <div className="flex items-center gap-1.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1.5">
        {/* Method selector */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className={`cursor-pointer rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-1.5 py-1 text-xs font-bold outline-none ${METHOD_COLORS[method]}`}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* URL input */}
        <input
          type="text"
          placeholder="https://api.example.com/endpoint"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
          className="flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
        />

        {/* History button */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="cursor-pointer rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-bright))] px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          title="History"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3a5 5 0 100 10A5 5 0 008 3zM0 8a8 8 0 1116 0A8 8 0 010 8z" />
            <path d="M8 4.5a.5.5 0 00-1 0v3.5h3.5a.5.5 0 000-1H8V4.5z" />
          </svg>
        </button>

        {/* Send/Cancel */}
        {loading ? (
          <button
            onClick={cancelRequest}
            className="cursor-pointer rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:opacity-90"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={sendRequest}
            disabled={!url.trim()}
            className="cursor-pointer rounded-md bg-[hsl(var(--accent))] px-3 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Request panel */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[hsl(var(--border))]">
          {/* Request tabs */}
          <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
            <button
              onClick={() => setBodyFormat('json')}
              className={`cursor-pointer px-3 py-1 text-xs ${bodyFormat === 'json' ? 'border-b-2 border-b-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Body
            </button>
            <button
              onClick={() => setBodyFormat('headers')}
              className={`cursor-pointer px-3 py-1 text-xs ${bodyFormat === 'headers' ? 'border-b-2 border-b-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Headers
            </button>
          </div>

          {/* Request body */}
          {bodyFormat === 'json' && (
            <textarea
              placeholder='{"key": "value"}'
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="flex-1 resize-none bg-[hsl(var(--background))] p-2 font-mono text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
              spellCheck={false}
            />
          )}

          {/* Headers editor */}
          {bodyFormat === 'headers' && (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                {headers.map((header) => (
                  <div key={header.id} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
                      className="h-3 w-3 cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Key"
                      value={header.key}
                      onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                      className="w-28 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={header.value}
                      onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                      className="flex-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] font-mono"
                    />
                    <button
                      onClick={() => removeHeader(header.id)}
                      className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addHeader}
                className="mt-2 w-full cursor-pointer rounded border border-dashed border-[hsl(var(--border))] px-2 py-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent)/0.5)] hover:text-[hsl(var(--accent))]"
              >
                + Add Header
              </button>
            </div>
          )}
        </div>

        {/* Response panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Response status bar */}
          {response && (
            <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1">
              <span className={`text-xs font-bold ${
                response.status >= 200 && response.status < 300 ? 'text-green-400' :
                response.status >= 400 ? 'text-red-400' :
                response.status === 0 ? 'text-[hsl(var(--muted-foreground))]' :
                'text-yellow-400'
              }`}>
                {response.status === 0 ? 'ERR' : response.status} {response.statusText}
              </span>
              <div className="flex-1" />
              <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                {formatDuration(response.duration)}
              </span>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                {formatBytes(response.size)}
              </span>
            </div>
          )}

          {/* Response tabs */}
          {response && (
            <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
              <button
                onClick={() => setResponseTab('body')}
                className={`cursor-pointer px-3 py-1 text-xs ${responseTab === 'body' ? 'border-b-2 border-b-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}
              >
                Body
              </button>
              <button
                onClick={() => setResponseTab('headers')}
                className={`cursor-pointer px-3 py-1 text-xs ${responseTab === 'headers' ? 'border-b-2 border-b-[hsl(var(--accent))] text-[hsl(var(--foreground))]' : 'text-[hsl(var(--muted-foreground))]'}`}
              >
                Headers
              </button>
            </div>
          )}

          {/* Response content */}
          <div className="flex-1 overflow-y-auto">
            {!response && !loading && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2 opacity-30">
                    <svg className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))]" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 2a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1v7.5a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 011 12.5V5a1 1 0 01-1-1V2zm2 3v7.5A1.5 1.5 0 004.5 14h9a1.5 1.5 0 001.5-1.5V5H2zm13-3H1v2h14V2zM5 7.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z" />
                    </svg>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Enter a URL and click Send</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--accent))] border-t-transparent mx-auto" />
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Sending request...</p>
                </div>
              </div>
            )}

            {response && responseTab === 'body' && (
              <pre className="p-2 font-mono text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap break-all">
                {formattedBody}
              </pre>
            )}

            {response && responseTab === 'headers' && (
              <div className="p-2 font-mono text-[10px]">
                {Object.entries(response.headers).map(([key, val]) => (
                  <div key={key} className="py-0.5">
                    <span className="text-[hsl(var(--accent))]">{key}:</span>{' '}
                    <span className="text-[hsl(var(--foreground))]">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="flex w-52 shrink-0 flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1">
              <span className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">History</span>
              <button
                onClick={() => setShowHistory(false)}
                className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <p className="p-2 text-[10px] text-[hsl(var(--muted-foreground))]">No requests yet</p>
              ) : (
                history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    className="w-full cursor-pointer border-b border-[hsl(var(--border))]/50 px-2 py-1.5 text-left hover:bg-[hsl(var(--muted))]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold ${METHOD_COLORS[entry.method]}`}>
                        {entry.method}
                      </span>
                      <span className={`text-[9px] ${
                        entry.status >= 200 && entry.status < 300 ? 'text-green-400' :
                        entry.status >= 400 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[9px] text-[hsl(var(--muted-foreground))] font-mono">
                      {entry.url}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
