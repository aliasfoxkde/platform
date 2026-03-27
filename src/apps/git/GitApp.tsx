import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'untracked';
  staged: boolean;
  diff?: string;
}

interface GitCommit {
  id: string;
  message: string;
  timestamp: number;
  author: string;
  files: number;
  additions: number;
  deletions: number;
}

interface GitBranch {
  name: string;
  active: boolean;
}

type TabView = 'changes' | 'history' | 'branches';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GIT_DATA_KEY = 'webos-git-data';

interface GitData {
  commits: GitCommit[];
  branches: GitBranch[];
  head: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function loadGitData(): GitData {
  try {
    const raw = localStorage.getItem(GIT_DATA_KEY);
    if (!raw) {
      const initial: GitData = {
        commits: [{
          id: generateId(),
          message: 'Initial commit',
          timestamp: Date.now() - 86400000,
          author: 'user',
          files: 3,
          additions: 45,
          deletions: 0,
        }],
        branches: [{ name: 'main', active: true }],
        head: 'main',
      };
      localStorage.setItem(GIT_DATA_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as GitData;
  } catch {
    return {
      commits: [],
      branches: [{ name: 'main', active: true }],
      head: 'main',
    };
  }
}

function saveGitData(data: GitData): void {
  localStorage.setItem(GIT_DATA_KEY, JSON.stringify(data));
}

function computeDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const result: string[] = [];

  let additions = 0;
  let deletions = 0;

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      result.push(`+ ${newLine}`);
      additions++;
    } else if (newLine === undefined) {
      result.push(`- ${oldLine}`);
      deletions++;
    } else if (oldLine !== newLine) {
      result.push(`- ${oldLine}`);
      result.push(`+ ${newLine}`);
      deletions++;
      additions++;
    } else {
      result.push(`  ${oldLine}`);
    }
  }

  return result.join('\n');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GitApp() {
  const [gitData, setGitData] = useState<GitData>(loadGitData);
  const [view, setView] = useState<TabView>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<GitFileStatus | null>(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const initRef = useRef(false);

  // Generate simulated file statuses from VFS
  const [fileStatuses, setFileStatuses] = useState<GitFileStatus[]>([]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    // Simulate some file statuses
    setFileStatuses([
      { path: '/Home/Notes/ideas.md', status: 'modified', staged: true },
      { path: '/Home/Projects/app.ts', status: 'modified', staged: false },
      { path: '/Home/config.json', status: 'added', staged: true },
      { path: '/Home/old-script.sh', status: 'deleted', staged: false },
      { path: '/Home/readme.md', status: 'untracked', staged: false },
    ]);
  }, []);

  // Persist git data
  useEffect(() => {
    saveGitData(gitData);
  }, [gitData]);

  const handleStage = useCallback((path: string) => {
    setFileStatuses((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: true } : f)),
    );
  }, []);

  const handleUnstage = useCallback((path: string) => {
    setFileStatuses((prev) =>
      prev.map((f) => (f.path === path ? { ...f, staged: false } : f)),
    );
  }, []);

  const handleStageAll = useCallback(() => {
    setFileStatuses((prev) => prev.map((f) => ({ ...f, staged: true })));
  }, []);

  const handleUnstageAll = useCallback(() => {
    setFileStatuses((prev) => prev.map((f) => ({ ...f, staged: false })));
  }, []);

  const handleCommit = useCallback(() => {
    if (!commitMessage.trim()) return;
    const stagedFiles = fileStatuses.filter((f) => f.staged);
    if (stagedFiles.length === 0) return;

    const newCommit: GitCommit = {
      id: generateId().slice(0, 7),
      message: commitMessage.trim(),
      timestamp: Date.now(),
      author: 'user',
      files: stagedFiles.length,
      additions: stagedFiles.reduce((sum) => sum + Math.floor(Math.random() * 20) + 1, 0),
      deletions: stagedFiles.reduce((sum) => sum + Math.floor(Math.random() * 5), 0),
    };

    setGitData((prev) => ({
      ...prev,
      commits: [newCommit, ...prev.commits],
    }));

    setFileStatuses((prev) => prev.filter((f) => !f.staged));
    setCommitMessage('');
  }, [commitMessage, fileStatuses]);

  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return;
    if (gitData.branches.some((b) => b.name === newBranchName.trim())) return;

    setGitData((prev) => ({
      ...prev,
      branches: [
        ...prev.branches.map((b) => ({ ...b, active: false })),
        { name: newBranchName.trim(), active: true },
      ],
      head: newBranchName.trim(),
    }));

    setNewBranchName('');
    setShowNewBranch(false);
  }, [newBranchName, gitData.branches]);

  const handleSwitchBranch = useCallback((name: string) => {
    setGitData((prev) => ({
      ...prev,
      branches: prev.branches.map((b) => ({ ...b, active: b.name === name })),
      head: name,
    }));
  }, []);

  const handleDeleteBranch = useCallback((name: string) => {
    if (name === 'main') return;
    setGitData((prev) => ({
      ...prev,
      branches: prev.branches.filter((b) => b.name !== name),
    }));
  }, []);

  const stagedCount = fileStatuses.filter((f) => f.staged).length;
  const unstagedCount = fileStatuses.filter((f) => !f.staged).length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1.5">
        <svg className="h-3.5 w-3.5 text-[hsl(var(--accent))]" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H1.5a.5.5 0 010-1h2.57a4.002 4.002 0 017.86 0h2.57a.5.5 0 010 1h-2.57zM8 11a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Git</span>

        <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
          {gitData.head}
        </span>

        <div className="flex-1" />

        <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
          {gitData.commits.length} commits
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        {(['changes', 'history', 'branches'] as TabView[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setDiffFile(null); }}
            className={`cursor-pointer px-3 py-1.5 text-xs capitalize ${
              view === v
                ? 'border-b-2 border-b-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {v}
            {v === 'changes' && stagedCount > 0 && (
              <span className="ml-1 rounded-full bg-[hsl(var(--accent))] px-1.5 py-px text-[9px] text-[hsl(var(--accent-foreground))]">
                {stagedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {view === 'changes' && (
            <ChangesView
              fileStatuses={fileStatuses}
              commitMessage={commitMessage}
              onCommitMessageChange={setCommitMessage}
              onStage={handleStage}
              onUnstage={handleUnstage}
              onStageAll={handleStageAll}
              onUnstageAll={handleUnstageAll}
              onCommit={handleCommit}
              onViewDiff={setDiffFile}
            />
          )}
          {view === 'history' && (
            <HistoryView
              commits={gitData.commits}
              expandedCommit={expandedCommit}
              onToggle={setExpandedCommit}
            />
          )}
          {view === 'branches' && (
            <BranchesView
              branches={gitData.branches}
              showNewBranch={showNewBranch}
              newBranchName={newBranchName}
              onNewBranchNameChange={setNewBranchName}
              onShowNewBranch={() => setShowNewBranch(true)}
              onCancelNewBranch={() => { setShowNewBranch(false); setNewBranchName(''); }}
              onCreateBranch={handleCreateBranch}
              onSwitchBranch={handleSwitchBranch}
              onDeleteBranch={handleDeleteBranch}
            />
          )}
        </div>

        {/* Diff panel */}
        {diffFile && (
          <DiffPanel file={diffFile} onClose={() => setDiffFile(null)} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Changes View
// ---------------------------------------------------------------------------

function ChangesView({
  fileStatuses,
  commitMessage,
  onCommitMessageChange,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  onCommit,
  onViewDiff,
}: {
  fileStatuses: GitFileStatus[];
  commitMessage: string;
  onCommitMessageChange: (msg: string) => void;
  onStage: (path: string) => void;
  onUnstage: (path: string) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onCommit: () => void;
  onViewDiff: (file: GitFileStatus) => void;
}) {
  const staged = fileStatuses.filter((f) => f.staged);
  const unstaged = fileStatuses.filter((f) => !f.staged);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Commit message */}
      <div className="border-b border-[hsl(var(--border))] p-2">
        <textarea
          placeholder="Commit message"
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
        />
        <button
          onClick={onCommit}
          disabled={!commitMessage.trim() || staged.length === 0}
          className="mt-1.5 w-full cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2 py-1 text-xs font-medium text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit ({staged.length} file{staged.length !== 1 ? 's' : ''})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Staged */}
        {staged.length > 0 && (
          <div>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--surface))]">
              <span className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Staged Changes ({staged.length})
              </span>
              <button
                onClick={onUnstageAll}
                className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Unstage All
              </button>
            </div>
            {staged.map((file) => (
              <FileRow key={file.path} file={file} onAction={onUnstage} onViewDiff={onViewDiff} actionLabel="Unstage" />
            ))}
          </div>
        )}

        {/* Unstaged */}
        {unstaged.length > 0 && (
          <div>
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--surface))]">
              <span className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
                Changes ({unstaged.length})
              </span>
              <button
                onClick={onStageAll}
                className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                Stage All
              </button>
            </div>
            {unstaged.map((file) => (
              <FileRow key={file.path} file={file} onAction={onStage} onViewDiff={onViewDiff} actionLabel="Stage" />
            ))}
          </div>
        )}

        {fileStatuses.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No changes</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Row
// ---------------------------------------------------------------------------

function FileRow({
  file,
  onAction,
  onViewDiff,
  actionLabel,
}: {
  file: GitFileStatus;
  onAction: (path: string) => void;
  onViewDiff: (file: GitFileStatus) => void;
  actionLabel: string;
}) {
  const statusColors: Record<string, string> = {
    added: 'text-green-500',
    modified: 'text-yellow-500',
    deleted: 'text-red-500',
    untracked: 'text-[hsl(var(--muted-foreground))]',
  };

  return (
    <div className="flex items-center gap-2 border-b border-[hsl(var(--border))]/50 px-2 py-1 hover:bg-[hsl(var(--surface))]">
      <span className="text-xs">{file.status === 'deleted' ? '🗑️' : file.status === 'added' ? '➕' : file.status === 'untracked' ? '❓' : '✏️'}</span>
      <span className="flex-1 truncate text-xs text-[hsl(var(--foreground))]">{file.path}</span>
      <span className={`text-[10px] uppercase ${statusColors[file.status]}`}>
        {file.status}
      </span>
      <button
        onClick={() => onViewDiff(file)}
        className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))]"
      >
        Diff
      </button>
      <button
        onClick={() => onAction(file.path)}
        className="cursor-pointer rounded px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History View
// ---------------------------------------------------------------------------

function HistoryView({
  commits,
  expandedCommit,
  onToggle,
}: {
  commits: GitCommit[];
  expandedCommit: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {commits.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">No commits</p>
        </div>
      ) : (
        commits.map((commit) => (
          <div key={commit.id} className="border-b border-[hsl(var(--border))]/50">
            <div
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-[hsl(var(--surface))]"
              onClick={() => onToggle(expandedCommit === commit.id ? null : commit.id)}
            >
              <svg
                className={`h-3 w-3 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-100 ${expandedCommit === commit.id ? 'rotate-90' : ''}`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M6 3l5 5-5 5V3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium text-[hsl(var(--foreground))]">
                  {commit.message}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[hsl(var(--muted-foreground))]">
                  <span className="font-mono">{commit.id}</span>
                  <span>{commit.author}</span>
                  <span>{timeAgo(commit.timestamp)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="text-green-500">+{commit.additions}</span>
                <span className="text-red-500">-{commit.deletions}</span>
              </div>
            </div>

            {expandedCommit === commit.id && (
              <div className="border-t border-[hsl(var(--border))]/50 bg-[hsl(var(--surface))] px-4 py-2">
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] space-y-0.5">
                  <div>Commit: {commit.id}</div>
                  <div>Author: {commit.author}</div>
                  <div>Date: {formatTimestamp(commit.timestamp)}</div>
                  <div>Files changed: {commit.files}</div>
                  <div className="flex gap-3">
                    <span className="text-green-500">+{commit.additions} additions</span>
                    <span className="text-red-500">-{commit.deletions} deletions</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branches View
// ---------------------------------------------------------------------------

function BranchesView({
  branches,
  showNewBranch,
  newBranchName,
  onNewBranchNameChange,
  onShowNewBranch,
  onCancelNewBranch,
  onCreateBranch,
  onSwitchBranch,
  onDeleteBranch,
}: {
  branches: GitBranch[];
  showNewBranch: boolean;
  newBranchName: string;
  onNewBranchNameChange: (name: string) => void;
  onShowNewBranch: () => void;
  onCancelNewBranch: () => void;
  onCreateBranch: () => void;
  onSwitchBranch: (name: string) => void;
  onDeleteBranch: (name: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1 bg-[hsl(var(--surface))]">
        <span className="text-[10px] font-semibold uppercase text-[hsl(var(--muted-foreground))]">
          Branches ({branches.length})
        </span>
        <button
          onClick={onShowNewBranch}
          className="cursor-pointer rounded px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
        >
          + New
        </button>
      </div>

      {/* New branch form */}
      {showNewBranch && (
        <div className="flex items-center gap-1.5 border-b border-[hsl(var(--border))] px-2 py-1.5 bg-[hsl(var(--surface))]">
          <input
            type="text"
            placeholder="Branch name..."
            value={newBranchName}
            onChange={(e) => onNewBranchNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreateBranch()}
            className="flex-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-1.5 py-1 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
            autoFocus
          />
          <button
            onClick={onCreateBranch}
            disabled={!newBranchName.trim() || branches.some((b) => b.name === newBranchName.trim())}
            className="cursor-pointer rounded bg-[hsl(var(--accent))] px-2 py-1 text-[9px] text-[hsl(var(--accent-foreground))] hover:opacity-90 disabled:opacity-40"
          >
            Create
          </button>
          <button
            onClick={onCancelNewBranch}
            className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto">
        {branches.map((branch) => (
          <div
            key={branch.name}
            className={`flex items-center gap-2 border-b border-[hsl(var(--border))]/50 px-2 py-1.5 ${
              branch.active ? 'bg-[hsl(var(--accent)/0.08)]' : ''
            }`}
          >
            <span className="text-xs">
              {branch.active ? '🌿' : '🌿'}
            </span>
            <span className={`flex-1 text-xs ${branch.active ? 'font-semibold text-[hsl(var(--accent))]' : 'text-[hsl(var(--foreground))]'}`}>
              {branch.name}
            </span>
            {branch.active && (
              <span className="rounded bg-[hsl(var(--accent)/0.15)] px-1.5 py-0.5 text-[8px] font-medium text-[hsl(var(--accent))]">
                HEAD
              </span>
            )}
            {!branch.active && branch.name !== 'main' && (
              <button
                onClick={() => onSwitchBranch(branch.name)}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--muted))]"
              >
                Switch
              </button>
            )}
            {!branch.active && branch.name !== 'main' && (
              <button
                onClick={() => onDeleteBranch(branch.name)}
                className="cursor-pointer text-[9px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diff Panel
// ---------------------------------------------------------------------------

function DiffPanel({
  file,
  onClose,
}: {
  file: GitFileStatus;
  onClose: () => void;
}) {
  // Generate a simulated diff
  const diffLines = useMemoDiff(file);

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-2 py-1">
        <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">Diff</span>
        <button onClick={onClose} className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
          ×
        </button>
      </div>
      <div className="border-b border-[hsl(var(--border))] px-2 py-1">
        <div className="truncate text-[10px] text-[hsl(var(--foreground))]">{file.path}</div>
        <span className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">{file.status}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-1 font-mono text-[10px]">
        <div className="mb-1 text-[hsl(var(--muted-foreground))]">@@ -1,3 +1,5 @@</div>
        {diffLines.map((line, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap ${
              line.startsWith('+') ? 'bg-green-900/20 text-green-400' :
              line.startsWith('-') ? 'bg-red-900/20 text-red-400' :
              'text-[hsl(var(--muted-foreground))]'
            }`}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function useMemoDiff(file: GitFileStatus): string[] {
  // Simulate diff based on file type
  const lines: string[] = [];
  const path = file.path.toLowerCase();

  if (path.endsWith('.ts') || path.endsWith('.tsx')) {
    lines.push('  import React from "react";', '  import { useState } from "react";');
    if (file.status !== 'deleted') {
      lines.push('+import { useCallback } from "react";', '+import { useEffect } from "react";');
    }
    lines.push('', '  function Component() {', '    const [state, setState] = useState(null);');
    if (file.status !== 'deleted') {
      lines.push('+    const memoized = useCallback(() => {');
      lines.push('+      return state?.value ?? null;');
      lines.push('+    }, [state]);');
    }
    lines.push('    return <div />;', '  }');
  } else if (path.endsWith('.md')) {
    lines.push('  # Title', '', '  Some content here.');
    if (file.status !== 'deleted') {
      lines.push('+', '+## New Section', '+');
      lines.push('+Added new content with details.');
    }
  } else {
    lines.push('  Line 1', '  Line 2', '  Line 3');
    if (file.status !== 'deleted') {
      lines.push('+  Line 4', '+  Line 5');
    }
    if (file.status === 'deleted') {
      lines.push('-  Line 4', '-  Line 5');
    }
  }

  return lines;
}
