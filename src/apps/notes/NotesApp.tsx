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
import { Toolbar, ToolbarButton, SearchInput, EmptyState } from '@/ui/components';
import { Icon } from '@/ui/icons';

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
            <SearchInput
              placeholder="Search notes..."
              value={searchQuery}
              onChange={setSearchQuery}
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
              <Toolbar>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  active={editor?.isActive('bold')}
                  title="Bold"
                >
                  <Icon name="bold" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  active={editor?.isActive('italic')}
                  title="Italic"
                >
                  <Icon name="italic" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleStrike().run()}
                  active={editor?.isActive('strike')}
                  title="Strikethrough"
                >
                  <Icon name="strikethrough" size="sm" />
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  active={editor?.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  <Icon name="heading-1" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  active={editor?.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  <Icon name="heading-2" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  active={editor?.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  <Icon name="heading-3" size="sm" />
                </ToolbarButton>

                <div className="mx-1 h-4 w-px bg-[hsl(var(--border))]" />

                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  active={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  <Icon name="list" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  active={editor?.isActive('orderedList')}
                  title="Ordered List"
                >
                  <Icon name="ordered-list" size="sm" />
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  active={editor?.isActive('codeBlock')}
                  title="Code Block"
                >
                  <Icon name="code" size="sm" />
                </ToolbarButton>

                <div className="flex-1" />

                <ToolbarButton
                  onClick={handleDeleteNote}
                  title="Delete note"
                >
                  <Icon name="trash" size="sm" />
                </ToolbarButton>
              </Toolbar>

              {/* Editor content */}
              <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
            </>
          ) : (
            <EmptyState
              icon={<Icon name="file-text" size="lg" />}
              title="Select a note or create a new one"
              className="flex-1"
            />
          )}
        </main>
      </div>
    </div>
  );
}

