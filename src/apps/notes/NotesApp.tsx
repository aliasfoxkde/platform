import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  listDirectory,
  readFile,
  writeFile,
  createDirectory,
  deletePath,
  exists,
} from '@/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteMeta {
  id: string;
  title: string;
  path: string;
  modified: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTES_DIR = '/Home/Notes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function ensureNotesDir(): Promise<void> {
  if (!(await exists(NOTES_DIR))) {
    await createDirectory(NOTES_DIR);
  }
}

function extractTitle(content: string): string {
  const firstLine = content.split('\n').find((l) => l.trim().length > 0);
  if (!firstLine) return 'Untitled';
  // Strip markdown heading markers
  const cleaned = firstLine.replace(/^#+\s*/, '').trim();
  return cleaned.length > 60 ? cleaned.slice(0, 60) + '...' : cleaned;
}

async function loadNotes(): Promise<NoteMeta[]> {
  if (!(await exists(NOTES_DIR))) return [];
  const entries = await listDirectory(NOTES_DIR);
  const notes: NoteMeta[] = [];
  for (const entry of entries) {
    if (entry.type === 'file' && entry.name.endsWith('.md')) {
      notes.push({
        id: entry.name.replace('.md', ''),
        title: entry.name.replace('.md', ''),
        path: entry.path,
        modified: entry.modified,
      });
    }
  }
  return notes.sort((a, b) => b.modified.localeCompare(a.modified));
}

async function loadNoteContent(path: string): Promise<string> {
  try {
    return await readFile(path);
  } catch {
    return '';
  }
}

async function saveNote(path: string, content: string): Promise<void> {
  await writeFile(path, content);
}

async function createNote(id: string): Promise<NoteMeta> {
  const path = `${NOTES_DIR}/${id}.md`;
  const content = `# ${id}\n\n`;
  await saveNote(path, content);
  return {
    id,
    title: id,
    path,
    modified: new Date().toISOString(),
  };
}

async function deleteNote(path: string): Promise<void> {
  await deletePath(path);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotesApp() {
  const [notes, setNotes] = useState<NoteMeta[]>([]);
  const [activeNote, setActiveNote] = useState<NoteMeta | null>(null);
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initRef = useRef(false);

  // Load notes on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    ensureNotesDir().then(() => {
      loadNotes().then(setNotes);
    });
  }, []);

  // Auto-save on content change
  useEffect(() => {
    if (!activeNote || !isEditing) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await saveNote(activeNote.path, content);
      // Update title and refresh list
      const title = extractTitle(content);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === activeNote.id
            ? { ...n, title, modified: new Date().toISOString() }
            : n,
        ),
      );
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [content, activeNote, isEditing]);

  const handleSelectNote = useCallback(async (note: NoteMeta) => {
    // Save current note first
    if (activeNote && isEditing) {
      await saveNote(activeNote.path, content);
    }
    const noteContent = await loadNoteContent(note.path);
    setActiveNote(note);
    setContent(noteContent);
    setIsEditing(false);
  }, [activeNote, content, isEditing]);

  const handleNewNote = useCallback(async () => {
    const id = generateId();
    const note = await createNote(id);
    setNotes((prev) => [note, ...prev]);
    setActiveNote(note);
    setContent(`# ${id}\n\n`);
    setIsEditing(true);
  }, []);

  const handleDeleteNote = useCallback(async () => {
    if (!activeNote) return;
    await deleteNote(activeNote.path);
    setNotes((prev) => prev.filter((n) => n.id !== activeNote.id));
    setActiveNote(null);
    setContent('');
  }, [activeNote]);

  const filteredNotes = searchQuery.trim()
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : notes;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      setContent(html);
      setIsEditing(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none min-h-full focus:outline-none p-4 text-[hsl(var(--foreground))]',
      },
    },
  });

  // Sync editor when switching notes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [activeNote?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] text-sm">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
          {/* Search */}
          <div className="p-2 border-b border-[hsl(var(--border))]">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--accent))]"
            />
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto p-1">
            {filteredNotes.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                {searchQuery ? 'No matches' : 'No notes yet'}
              </p>
            ) : (
              filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`w-full cursor-pointer rounded-md px-2.5 py-2 text-left transition-colors duration-100 ${
                    activeNote?.id === note.id
                      ? 'bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]'
                      : 'text-[hsl(var(--surface-foreground))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  <div className="truncate text-xs font-medium">{note.title}</div>
                  <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {new Date(note.modified).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* New note button */}
          <div className="border-t border-[hsl(var(--border))] p-2">
            <button
              onClick={handleNewNote}
              className="w-full cursor-pointer rounded-md bg-[hsl(var(--accent))] px-2.5 py-1.5 text-xs font-medium text-[hsl(var(--accent-foreground))] transition-opacity duration-100 hover:opacity-90"
            >
              + New Note
            </button>
          </div>
        </aside>

        {/* Editor */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {activeNote ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-2 py-1.5">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editor?.isActive('bold')}
                  title="Bold"
                >
                  <span className="font-bold">B</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editor?.isActive('italic')}
                  title="Italic"
                >
                  <span className="italic">I</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  isActive={editor?.isActive('strike')}
                  title="Strikethrough"
                >
                  <span className="line-through">S</span>
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  isActive={editor?.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  <span className="text-xs font-bold">H1</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  isActive={editor?.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  <span className="text-xs font-bold">H2</span>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  isActive={editor?.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  <span className="text-xs font-bold">H3</span>
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12v1H2V4zm0 4h12v1H2V8zm0 4h12v1H2v-1z" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editor?.isActive('orderedList')}
                  title="Ordered List"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 2v12H4V2h1zm5 0a3 3 0 013 3v6a3 3 0 01-3 3H8v-1h2a2 2 0 002-2V5a2 2 0 00-2-2H8V2h2z" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  isActive={editor?.isActive('codeBlock')}
                  title="Code Block"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 1.5L1 5l3 3.5L1 12l1.5.5L6 8.5 3.5 5 6 1.5H4zm7 0L15 5l-3 3.5L15 12l-1.5.5L10 8.5 12.5 5 10 1.5h1z" />
                  </svg>
                </ToolbarButton>

                <div className="flex-1" />

                <button
                  onClick={handleDeleteNote}
                  className="cursor-pointer rounded-md px-2 py-1 text-xs text-[hsl(var(--muted-foreground))] transition-colors duration-100 hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))]"
                  title="Delete note"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                    <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H5.5l1-1h3l1 1h2.5a1 1 0 011 1v1z" />
                  </svg>
                </button>
              </div>

              {/* Editor content */}
              <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[hsl(var(--muted-foreground))]">
              <div className="text-center">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-sm">Select a note or create a new one</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`cursor-pointer rounded px-1.5 py-1 text-xs transition-colors duration-100 ${
        isActive
          ? 'bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]'
          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]'
      }`}
    >
      {children}
    </button>
  );
}
