/**
 * Virtual File System (VFS)
 *
 * IndexedDB-backed filesystem providing:
 * - Hierarchical directory tree
 * - File read/write/delete
 * - Directory listing, creation, deletion
 * - File metadata (name, type, size, modified, created)
 * - Path resolution and validation
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export interface VFSNode {
  /** Unique path, e.g. "/Home/Documents/readme.txt" */
  path: string;
  /** Node type */
  type: 'file' | 'directory';
  /** File content (empty string for directories) */
  content: string;
  /** MIME type for files */
  mimeType?: string;
  /** Byte size of content */
  size: number;
  /** ISO 8601 modified timestamp */
  modified: string;
  /** ISO 8601 created timestamp */
  created: string;
}

export interface VFSEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  mimeType?: string;
  size: number;
  modified: string;
}

/* -------------------------------------------------------------------------- */
/* Database                                                                    */
/* -------------------------------------------------------------------------- */

const DB_NAME = 'webos-vfs';
const DB_VERSION = 1;
const STORE_NAME = 'nodes';

let dbPromise: Promise<IDBDatabase> | null = null;

/** Reset the database connection (for testing) */
export function resetVFS(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {});
    dbPromise = null;
  }
}

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'path' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

/* -------------------------------------------------------------------------- */
/* Path helpers                                                                */
/* -------------------------------------------------------------------------- */

export function normalizePath(path: string): string {
  let p = path.replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = '/' + p;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

export function parentPath(path: string): string {
  const p = normalizePath(path);
  if (p === '/') return '/';
  const idx = p.lastIndexOf('/');
  return idx <= 0 ? '/' : p.slice(0, idx);
}

export function baseName(path: string): string {
  const p = normalizePath(path);
  if (p === '/') return '/';
  return p.slice(p.lastIndexOf('/') + 1);
}

/* -------------------------------------------------------------------------- */
/* Core operations                                                             */
/* -------------------------------------------------------------------------- */

/** Initialize the VFS with a default directory structure */
export async function initVFS(): Promise<void> {
  const defaults: VFSNode[] = [
    vfsDir('/Home'),
    vfsDir('/Home/Documents'),
    vfsDir('/Home/Downloads'),
    vfsDir('/Home/Pictures'),
    vfsDir('/Home/Desktop'),
    vfsDir('/tmp'),
    vfsFile('/Home/readme.txt', 'text/plain', 'Welcome to WebOS.\n'),
    vfsFile('/Home/notes.md', 'text/markdown', '# Notes\n\nMy notes go here.\n'),
    vfsFile('/Home/Documents/todo.txt', 'text/plain', '- Build something amazing\n'),
  ];

  for (const node of defaults) {
    await putNode(node);
  }
}

function vfsDir(path: string): VFSNode {
  const now = new Date().toISOString();
  return { path: normalizePath(path), type: 'directory', content: '', size: 0, modified: now, created: now };
}

function vfsFile(path: string, mimeType: string, content: string): VFSNode {
  const now = new Date().toISOString();
  return { path: normalizePath(path), type: 'file', content, mimeType, size: new Blob([content]).size, modified: now, created: now };
}

async function putNode(node: VFSNode): Promise<void> {
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(node);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getNode(path: string): Promise<VFSNode | undefined> {
  const store = await getStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(normalizePath(path));
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

async function deleteNode(path: string): Promise<void> {
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(normalizePath(path));
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Get all nodes whose path starts with prefix */
async function getNodesByPrefix(prefix: string): Promise<VFSNode[]> {
  const store = await getStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all: VFSNode[] = req.result ?? [];
      resolve(all.filter((n) => n.path.startsWith(prefix)));
    };
    req.onerror = () => reject(req.error);
  });
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** Read file content */
export async function readFile(path: string): Promise<string> {
  const node = await getNode(path);
  if (!node) throw new Error(`File not found: ${path}`);
  if (node.type !== 'file') throw new Error(`Not a file: ${path}`);
  return node.content;
}

/** Write file content (creates or overwrites) */
export async function writeFile(path: string, content: string, mimeType?: string): Promise<void> {
  const normalized = normalizePath(path);
  const parent = parentPath(normalized);

  // Ensure parent directory exists
  const parentNode = await getNode(parent);
  if (!parentNode) throw new Error(`Parent directory not found: ${parent}`);
  if (parentNode.type !== 'directory') throw new Error(`Parent is not a directory: ${parent}`);

  const now = new Date().toISOString();
  const existing = await getNode(normalized);

  const node: VFSNode = {
    path: normalized,
    type: 'file',
    content,
    mimeType: mimeType ?? guessMime(path),
    size: new Blob([content]).size,
    modified: now,
    created: existing?.created ?? now,
  };

  await putNode(node);
}

/** Delete a file or directory (recursive) */
export async function deletePath(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const node = await getNode(normalized);
  if (!node) throw new Error(`Path not found: ${normalized}`);

  if (node.type === 'directory') {
    const children = await getNodesByPrefix(normalized + '/');
    for (const child of children) {
      await deleteNode(child.path);
    }
  }
  await deleteNode(normalized);
}

/** Create a directory (creates parent directories as needed) */
export async function createDirectory(path: string): Promise<void> {
  const normalized = normalizePath(path);
  const existing = await getNode(normalized);
  if (existing) {
    if (existing.type !== 'directory') throw new Error(`Already exists as file: ${normalized}`);
    return; // Already exists as directory
  }

  // Create parent directories recursively
  const parent = parentPath(normalized);
  if (parent !== normalized) {
    await createDirectory(parent);
  }

  const now = new Date().toISOString();
  await putNode({ path: normalized, type: 'directory', content: '', size: 0, modified: now, created: now });
}

/** List directory contents */
export async function listDirectory(path: string): Promise<VFSEntry[]> {
  const normalized = normalizePath(path);
  const node = await getNode(normalized);
  if (!node) throw new Error(`Directory not found: ${normalized}`);
  if (node.type !== 'directory') throw new Error(`Not a directory: ${normalized}`);

  const prefix = normalized === '/' ? '/' : normalized + '/';
  const allNodes = await getNodesByPrefix(prefix);

  // Filter to direct children only (one level deep)
  const children = allNodes.filter((n) => {
    if (n.path === normalized) return false;
    const relative = n.path.slice(prefix.length);
    // Direct child has no remaining slashes
    return !relative.includes('/');
  });

  return children
    .map((n) => ({
      name: baseName(n.path),
      path: n.path,
      type: n.type,
      mimeType: n.mimeType,
      size: n.size,
      modified: n.modified,
    }))
    .sort((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

/** Check if a path exists */
export async function exists(path: string): Promise<boolean> {
  const node = await getNode(normalizePath(path));
  return node !== undefined;
}

/** Get metadata for a path (without content) */
export async function stat(path: string): Promise<VFSEntry | null> {
  const node = await getNode(normalizePath(path));
  if (!node) return null;
  return {
    name: baseName(node.path),
    path: node.path,
    type: node.type,
    mimeType: node.mimeType,
    size: node.size,
    modified: node.modified,
  };
}

/** Move/rename a file or directory */
export async function movePath(from: string, to: string): Promise<void> {
  const normalizedFrom = normalizePath(from);
  const normalizedTo = normalizePath(to);

  const node = await getNode(normalizedFrom);
  if (!node) throw new Error(`Path not found: ${normalizedFrom}`);

  // Ensure destination parent exists
  const destParent = parentPath(normalizedTo);
  const parentNode = await getNode(destParent);
  if (!parentNode || parentNode.type !== 'directory') {
    throw new Error(`Destination parent directory not found: ${destParent}`);
  }

  // Check destination doesn't already exist
  if (await exists(normalizedTo)) {
    throw new Error(`Destination already exists: ${normalizedTo}`);
  }

  if (node.type === 'directory') {
    // Move the directory node itself
    await putNode({ ...node, path: normalizedTo, modified: new Date().toISOString() });
    // Move all children recursively
    const children = await getNodesByPrefix(normalizedFrom + '/');
    for (const child of children) {
      const newPath = normalizedTo + child.path.slice(normalizedFrom.length);
      await putNode({ ...child, path: newPath });
    }
    await deleteNode(normalizedFrom);
  } else {
    // Move single file
    await deleteNode(normalizedFrom);
    await putNode({ ...node, path: normalizedTo, modified: new Date().toISOString() });
  }
}

/** Copy a file */
export async function copyFile(from: string, to: string): Promise<void> {
  const normalizedFrom = normalizePath(from);
  const normalizedTo = normalizePath(to);

  const node = await getNode(normalizedFrom);
  if (!node) throw new Error(`File not found: ${normalizedFrom}`);
  if (node.type !== 'file') throw new Error(`Can only copy files: ${normalizedFrom}`);

  const destParent = parentPath(normalizedTo);
  if (!(await exists(destParent))) {
    throw new Error(`Destination parent directory not found: ${destParent}`);
  }

  const now = new Date().toISOString();
  await putNode({
    ...node,
    path: normalizedTo,
    created: now,
    modified: now,
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function guessMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    jsx: 'text/javascript',
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };
  return map[ext] ?? 'application/octet-stream';
}
