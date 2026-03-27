import { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  listDirectory,
  readFile,
  writeFile,
  deletePath,
  createDirectory,
  exists,
  normalizePath,
  baseName,
  parentPath,
} from '@/storage';
import { Toolbar, ToolbarButton, SearchInput, TabBar, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TabInfo {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
  viewState?: editor.ICodeEditorViewState;
}

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
}

interface SearchResult {
  path: string;
  line: number;
  col: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  json: 'json',
  md: 'markdown',
  css: 'css',
  html: 'html',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sh: 'shell',
  bash: 'shell',
  sql: 'sql',
  txt: 'plaintext',
  toml: 'ini',
  env: 'ini',
  gitignore: 'plaintext',
};

function getLanguage(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()! : filename;
  return LANGUAGE_MAP[ext.toLowerCase()] ?? 'plaintext';
}

const ROOT_DIRS = ['/Home', '/System', '/Apps'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IDEApp() {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to IDE Terminal. Type "help" for commands.']);
  const [terminalCwd, setTerminalCwd] = useState('/Home');

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.path === activeTabPath) ?? null;

  // Build file tree
  const refreshTree = useCallback(async () => {
    const buildNode = async (dirPath: string): Promise<FileNode> => {
      const entries = await listDirectory(dirPath).catch(() => []);
      const children: FileNode[] = [];

      const dirs = entries.filter((e) => e.type === 'directory').sort((a, b) => a.name.localeCompare(b.name));
      const files = entries.filter((e) => e.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

      for (const dir of dirs) {
        if (dir.name.startsWith('.')) continue;
        children.push(await buildNode(dir.path));
      }
      for (const file of files) {
        if (file.name.startsWith('.')) continue;
        children.push({ name: file.name, path: file.path, type: 'file' });
      }

      return {
        name: baseName(dirPath),
        path: dirPath,
        type: 'directory',
        children,
        expanded: dirPath === '/Home',
      };
    };

    const tree: FileNode[] = [];
    for (const dir of ROOT_DIRS) {
      if (await exists(dir)) {
        tree.push(await buildNode(dir));
      }
    }
    setFileTree(tree);
  }, []);

  useEffect(() => {
    refreshTree();
  }, [refreshTree]);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  // Handle editor mount
  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Save current view state when switching tabs
  const handleTabSwitch = useCallback((path: string) => {
    if (editorRef.current && activeTab) {
      const viewState = editorRef.current.saveViewState();
      setTabs((prev) =>
        prev.map((t) => (t.path === activeTab.path ? { ...t, viewState } : t)),
      );
    }
    setActiveTabPath(path);
  }, [activeTab]);

  // Restore view state after editor remounts
  useEffect(() => {
    if (editorRef.current && activeTab?.viewState) {
      // Small delay to let Monaco finish rendering
      const timer = setTimeout(() => {
        editorRef.current?.restoreViewState(activeTab.viewState);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTabPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open file
  const openFile = useCallback(async (path: string) => {
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      handleTabSwitch(path);
      return;
    }

    const content = await readFile(path).catch(() => '');
    const name = baseName(path);
    const language = getLanguage(name);
    const newTab: TabInfo = { path, name, content, language, modified: false };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabPath(path);
  }, [tabs, handleTabSwitch]);

  // Save file
  const saveFile = useCallback(async () => {
    if (!activeTab) return;
    await writeFile(activeTab.path, activeTab.content);
    setTabs((prev) =>
      prev.map((t) => (t.path === activeTab.path ? { ...t, modified: false } : t)),
    );
    refreshTree();
  }, [activeTab, refreshTree]);

  // Close tab
  const closeTab = useCallback((path: string, idx: number) => {
    setTabs((prev) => prev.filter((_, i) => i !== idx));
    if (activeTabPath === path) {
      const remaining = tabs.filter((_, i) => i !== idx);
      setActiveTabPath(remaining.length > 0 ? remaining[Math.min(idx, remaining.length - 1)].path : null);
    }
  }, [activeTabPath, tabs]);

  // New file
  const createNewFile = useCallback(async () => {
    let counter = 1;
    let name = 'untitled.txt';
    let path = `/Home/${name}`;
    while (await exists(path)) {
      counter++;
      name = `untitled-${counter}.txt`;
      path = `/Home/${name}`;
    }
    await writeFile(path, '');
    await openFile(path);
    refreshTree();
  }, [openFile, refreshTree]);

  // Delete file
  const deleteFile = useCallback(async (path: string) => {
    await deletePath(path);
    setTabs((prev) => prev.filter((t) => t.path !== path));
    if (activeTabPath === path) {
      setActiveTabPath(null);
    }
    refreshTree();
  }, [activeTabPath, refreshTree]);

  // Editor content change
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!activeTab) return;
    const content = value ?? '';
    setTabs((prev) =>
      prev.map((t) =>
        t.path === activeTab.path ? { ...t, content, modified: content !== '' } : t,
      ),
    );
  }, [activeTab]);

  // Search in files
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();
    const searchDir = async (dirPath: string) => {
      const entries = await listDirectory(dirPath).catch(() => []);
      for (const entry of entries) {
        if (entry.type === 'directory') {
          await searchDir(entry.path);
        } else if (entry.type === 'file') {
          const content = await readFile(entry.path).catch(() => '');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const col = lines[i].toLowerCase().indexOf(query);
            if (col !== -1) {
              results.push({
                path: entry.path,
                line: i + 1,
                col: col + 1,
                text: lines[i].trim(),
              });
              if (results.length >= 200) return;
            }
          }
          if (results.length >= 200) return;
        }
      }
    };

    for (const dir of ROOT_DIRS) {
      if (await exists(dir)) {
        await searchDir(dir);
      }
      if (results.length >= 200) break;
    }

    setSearchResults(results);
  }, [searchQuery]);

  // Terminal commands
  const handleTerminalSubmit = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setTerminalOutput((prev) => [...prev, `${terminalCwd} $ ${trimmed}`]);
    setTerminalInput('');

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    const exec = async () => {
      try {
        switch (cmd) {
          case 'help':
            setTerminalOutput((prev) => [...prev, 'Commands: ls, cd, cat, mkdir, touch, rm, pwd, echo, clear']);
            break;
          case 'pwd':
            setTerminalOutput((prev) => [...prev, terminalCwd]);
            break;
          case 'ls': {
            const target = args[0] ? normalizePath(terminalCwd + '/' + args[0]) : terminalCwd;
            const entries = await listDirectory(target).catch(() => []);
            if (entries.length === 0) {
              setTerminalOutput((prev) => [...prev, '(empty)']);
            } else {
              setTerminalOutput((prev) => [...prev, entries.map((e) => `${e.type === 'directory' ? '📁' : '📄'} ${e.name}`).join('\n')]);
            }
            break;
          }
          case 'cd': {
            const target = args[0] ? normalizePath(terminalCwd + '/' + args[0]) : '/Home';
            if (await exists(target)) {
              setTerminalCwd(target);
            } else {
              setTerminalOutput((prev) => [...prev, `cd: ${args[0]}: not found`]);
            }
            break;
          }
          case 'cat': {
            if (!args[0]) {
              setTerminalOutput((prev) => [...prev, 'cat: missing file']);
              break;
            }
            const target = normalizePath(terminalCwd + '/' + args[0]);
            const content = await readFile(target).catch(() => null);
            setTerminalOutput((prev) => [...prev, content ?? `cat: ${args[0]}: not found`]);
            break;
          }
          case 'mkdir': {
            if (!args[0]) {
              setTerminalOutput((prev) => [...prev, 'mkdir: missing directory']);
              break;
            }
            const target = normalizePath(terminalCwd + '/' + args[0]);
            await createDirectory(target);
            refreshTree();
            break;
          }
          case 'touch': {
            if (!args[0]) {
              setTerminalOutput((prev) => [...prev, 'touch: missing file']);
              break;
            }
            const target = normalizePath(terminalCwd + '/' + args[0]);
            await writeFile(target, '');
            refreshTree();
            break;
          }
          case 'rm': {
            if (!args[0]) {
              setTerminalOutput((prev) => [...prev, 'rm: missing file']);
              break;
            }
            const target = normalizePath(terminalCwd + '/' + args[0]);
            await deletePath(target);
            refreshTree();
            break;
          }
          case 'echo':
            setTerminalOutput((prev) => [...prev, args.join(' ')]);
            break;
          case 'clear':
            setTerminalOutput([]);
            break;
          default:
            setTerminalOutput((prev) => [...prev, `${cmd}: command not found`]);
        }
      } catch (err) {
        setTerminalOutput((prev) => [...prev, `Error: ${err instanceof Error ? err.message : String(err)}`]);
      }
    };

    exec();
  }, [terminalCwd, refreshTree]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveFile, createNewFile]);

  // Editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
    minimap: { enabled: true, scale: 1 },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
    tabSize: 2,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true },
    padding: { top: 8 },
    theme: 'vs-dark',
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#1e1e1e]">
      {/* Toolbar */}
      <Toolbar className="gap-1 border-[#333] bg-[#252526] px-2 py-0.5">
        <ToolbarButton onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar" active={showSidebar}>
          <Icon name="menu" size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowSearch(!showSearch)} title="Search (Ctrl+P)" active={showSearch}>
          <Icon name="search" size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowTerminal(!showTerminal)} title="Toggle Terminal" active={showTerminal}>
          <Icon name="terminal" size={14} />
        </ToolbarButton>

        <div className="mx-1 h-4 w-px bg-[#444]" />

        <ToolbarButton onClick={createNewFile} title="New File (Ctrl+N)">
          <Icon name="plus" size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={saveFile} title="Save (Ctrl+S)">
          <Icon name="save" size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={refreshTree} title="Refresh File Tree">
          <Icon name="refresh" size={14} />
        </ToolbarButton>

        <div className="flex-1" />

        {activeTab && (
          <span className="text-[10px] text-[#999]">
            {activeTab.language} — {baseName(activeTab.path)}
          </span>
        )}
      </Toolbar>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <div className="flex w-52 shrink-0 flex-col border-r border-[#333] bg-[#252526]">
            {showSearch ? (
              <SearchPanel
                query={searchQuery}
                results={searchResults}
                onQueryChange={setSearchQuery}
                onSearch={handleSearch}
                onResultClick={(r) => {
                  openFile(r.path);
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                onClose={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              />
            ) : (
              <FileTreePanel
                tree={fileTree}
                onOpenFile={openFile}
                onDeleteFile={deleteFile}
                onRefresh={refreshTree}
                onToggle={() => setShowSearch(true)}
              />
            )}
          </div>
        )}

        {/* Editor area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tabs */}
          {tabs.length > 0 && (
            <TabBar
              tabs={tabs.map((tab) => ({
                id: tab.path,
                label: tab.name,
                modified: tab.modified,
              }))}
              activeTabId={activeTabPath ?? ''}
              onTabChange={handleTabSwitch}
              onTabClose={(id) => {
                const idx = tabs.findIndex((t) => t.path === id);
                if (idx !== -1) closeTab(id, idx);
              }}
              className="border-b border-[#333] bg-[#2d2d2d]"
            />
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {activeTab ? (
              <Editor
                key={activeTab.path}
                language={activeTab.language}
                value={activeTab.content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={editorOptions}
                theme="vs-dark"
              />
            ) : (
              <EmptyState
                icon={<Icon name="edit" size={32} />}
                title="No file open"
                description="Open a file from the sidebar or press Ctrl+N"
              />
            )}
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="flex flex-col border-t border-[#333] bg-[#1e1e1e]" style={{ height: '180px' }}>
              <div className="flex items-center justify-between border-b border-[#333] px-2 py-0.5">
                <span className="text-[10px] text-[#999] uppercase tracking-wide">Terminal</span>
                <button
                  onClick={() => setShowTerminal(false)}
                  className="text-[#999] hover:text-[#fff] text-xs"
                >
                  <Icon name="xmark" size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 py-1 font-mono text-xs">
                {terminalOutput.map((line, i) => (
                  <div key={i} className="text-[#ccc] whitespace-pre-wrap">{line}</div>
                ))}
                <div className="flex items-center text-[#ccc]">
                  <span className="text-[#6a9955] mr-1">{terminalCwd} $</span>
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTerminalSubmit(terminalInput);
                    }}
                    className="flex-1 bg-transparent text-[#ccc] outline-none"
                    autoFocus
                  />
                </div>
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[#007acc] bg-[#007acc] px-2 py-0.5">
        <div className="flex items-center gap-3 text-[10px] text-white">
          <span>WebOS IDE</span>
          {activeTab && (
            <>
              <span>{baseName(activeTab.path)}</span>
              <span>{activeTab.language}</span>
              {activeTab.modified && <span className="text-yellow-200">Modified</span>}
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white">
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Tree Panel
// ---------------------------------------------------------------------------

function FileTreePanel({
  tree,
  onOpenFile,
  onDeleteFile,
  onRefresh,
  onToggle,
}: {
  tree: FileNode[];
  onOpenFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRefresh: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#333] px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onToggle}
            className="cursor-pointer rounded p-0.5 text-[#999] hover:text-[#fff]"
            title="Search files"
          >
            <Icon name="search" size={12} />
          </button>
          <button
            onClick={onRefresh}
            className="cursor-pointer rounded p-0.5 text-[#999] hover:text-[#fff]"
            title="Refresh"
          >
            <Icon name="refresh" size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-0.5">
        {tree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            onOpenFile={onOpenFile}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Tree Node (recursive)
// ---------------------------------------------------------------------------

function FileTreeNode({
  node,
  depth,
  onOpenFile,
  onDeleteFile,
}: {
  node: FileNode;
  depth: number;
  onOpenFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.expanded ?? false);
  const [showContext, setShowContext] = useState(false);

  const handleClick = () => {
    if (node.type === 'directory') {
      setExpanded(!expanded);
    } else {
      onOpenFile(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContext(true);
  };

  return (
    <div>
      <div
        className="flex cursor-pointer items-center hover:bg-[#2a2d2e] group"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Chevron for directories */}
        {node.type === 'directory' ? (
          <Icon
            name="chevron-right"
            size={12}
            className={`mr-0.5 shrink-0 text-[#ccc] transition-transform duration-100 ${expanded ? 'rotate-90' : ''}`}
          />
        ) : (
          <span className="mr-0.5 w-3 shrink-0" />
        )}

        {/* Icon */}
        <span className="mr-1 text-xs leading-none">
          {node.type === 'directory'
            ? expanded ? '📂' : '📁'
            : getFileIcon(node.name)}
        </span>

        {/* Name */}
        <span className="truncate text-xs text-[#ccc] group-hover:text-white">
          {node.name}
        </span>

        {/* Delete button on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFile(node.path);
          }}
          className="ml-auto mr-1 hidden group-hover:block rounded p-0.5 text-[#999] hover:text-[#f44] hover:bg-[#333]"
          title="Delete"
        >
          <Icon name="xmark" size={12} />
        </button>
      </div>

      {/* Children */}
      {node.type === 'directory' && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onOpenFile={onOpenFile}
              onDeleteFile={onDeleteFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Panel
// ---------------------------------------------------------------------------

function SearchPanel({
  query,
  results,
  onQueryChange,
  onSearch,
  onResultClick,
  onClose,
}: {
  query: string;
  results: SearchResult[];
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  onResultClick: (r: SearchResult) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-[#333] px-2 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#bbb]">Search</span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="cursor-pointer rounded p-0.5 text-[#999] hover:text-[#fff]"
        >
          <Icon name="xmark" size={12} />
        </button>
      </div>
      <div className="border-b border-[#333] p-1.5">
        <div className="flex gap-1">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            placeholder="Search in files..."
            className="flex-1 text-xs bg-[#3c3c3c] border-[#444]"
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
          />
          <button
            onClick={onSearch}
            className="cursor-pointer rounded bg-[#0e639c] px-2 py-1 text-[10px] text-white hover:bg-[#1177bb]"
          >
            Search
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1 py-0.5">
        {results.length === 0 && query && (
          <p className="px-1 py-2 text-[10px] text-[#666]">No results</p>
        )}
        {results.map((r, i) => (
          <button
            key={`${r.path}:${r.line}:${i}`}
            onClick={() => onResultClick(r)}
            className="mb-0.5 w-full cursor-pointer rounded px-1.5 py-0.5 text-left hover:bg-[#2a2d2e]"
          >
            <div className="text-[10px] text-[#4ec9b0] truncate">{baseName(r.path)}</div>
            <div className="text-[9px] text-[#999]">
              <span className="text-[#bbb]">:{r.line}:{r.col}</span>{' '}
              <span className="text-[#ccc] truncate">{r.text.slice(0, 80)}</span>
            </div>
          </button>
        ))}
      </div>
      {results.length > 0 && (
        <div className="border-t border-[#333] px-2 py-0.5 text-[9px] text-[#666]">
          {results.length} result{results.length !== 1 ? 's' : ''}
          {results.length >= 200 && ' (truncated)'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileIcon(name: string): string {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const icons: Record<string, string> = {
    ts: '🔷', tsx: '⚛️', js: '🔶', jsx: '⚡',
    json: '📋', md: '📝', css: '🎨', html: '🌐',
    py: '🐍', rs: '🦀', go: '🐹', sh: '🐚',
    txt: '📄', yml: '⚙️', yaml: '⚙️', toml: '⚙️',
  };
  return icons[ext] ?? '📄';
}
