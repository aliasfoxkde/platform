// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetVFS } from '../vfs';

describe('VFS path utilities', () => {
  it('normalizes paths', async () => {
    const { normalizePath } = await import('../vfs');
    expect(normalizePath('Home/Documents')).toBe('/Home/Documents');
    expect(normalizePath('/Home/Documents/')).toBe('/Home/Documents');
    expect(normalizePath('///Home///Documents///')).toBe('/Home/Documents');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/')).toBe('/');
  });

  it('gets parent path', async () => {
    const { parentPath } = await import('../vfs');
    expect(parentPath('/Home/Documents/file.txt')).toBe('/Home/Documents');
    expect(parentPath('/Home/Documents')).toBe('/Home');
    expect(parentPath('/Home')).toBe('/');
    expect(parentPath('/')).toBe('/');
  });

  it('gets base name', async () => {
    const { baseName } = await import('../vfs');
    expect(baseName('/Home/Documents/file.txt')).toBe('file.txt');
    expect(baseName('/Home/Documents')).toBe('Documents');
    expect(baseName('/Home')).toBe('Home');
    expect(baseName('/')).toBe('/');
  });
});

describe('VFS with fake-indexeddb', () => {
  let vfs: typeof import('../vfs');

  beforeEach(async () => {
    resetVFS();
    indexedDB.deleteDatabase('webos-vfs');
    // Wait for delete to complete
    await new Promise((r) => setTimeout(r, 10));
    // Re-import to get fresh module state
    vfs = await import('../vfs');
  });

  it('initializes default directory structure', async () => {
    await vfs.initVFS();

    expect(await vfs.exists('/Home')).toBe(true);
    expect(await vfs.exists('/Home/Documents')).toBe(true);
    expect(await vfs.exists('/Home/Downloads')).toBe(true);
    expect(await vfs.exists('/Home/Pictures')).toBe(true);
    expect(await vfs.exists('/Home/readme.txt')).toBe(true);
    expect(await vfs.exists('/Home/notes.md')).toBe(true);
  });

  it('creates and reads files', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/test.txt', 'Hello, WebOS!');
    const content = await vfs.readFile('/Home/test.txt');
    expect(content).toBe('Hello, WebOS!');
  });

  it('creates directories', async () => {
    await vfs.initVFS();

    await vfs.createDirectory('/Home/NewFolder');
    expect(await vfs.exists('/Home/NewFolder')).toBe(true);

    await vfs.createDirectory('/Home/NewFolder/Sub/Deep');
    expect(await vfs.exists('/Home/NewFolder/Sub/Deep')).toBe(true);
  });

  it('lists directory contents', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/Documents/a.txt', 'a');
    await vfs.writeFile('/Home/Documents/b.txt', 'b');

    const entries = await vfs.listDirectory('/Home/Documents');
    const names = entries.map((e) => e.name);
    expect(names).toContain('a.txt');
    expect(names).toContain('b.txt');
  });

  it('deletes files', async () => {
    await vfs.initVFS();

    expect(await vfs.exists('/Home/readme.txt')).toBe(true);
    await vfs.deletePath('/Home/readme.txt');
    expect(await vfs.exists('/Home/readme.txt')).toBe(false);
    await expect(vfs.readFile('/Home/readme.txt')).rejects.toThrow('File not found');
  });

  it('deletes directories recursively', async () => {
    await vfs.initVFS();

    await vfs.createDirectory('/Home/test');
    await vfs.writeFile('/Home/test/file1.txt', '1');
    await vfs.writeFile('/Home/test/file2.txt', '2');

    await vfs.deletePath('/Home/test');
    expect(await vfs.exists('/Home/test')).toBe(false);
    expect(await vfs.exists('/Home/test/file1.txt')).toBe(false);
  });

  it('overwrites existing files', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/test.txt', 'first');
    await vfs.writeFile('/Home/test.txt', 'second');
    expect(await vfs.readFile('/Home/test.txt')).toBe('second');
  });

  it('stat returns metadata without content', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/test.txt', 'content');
    const meta = await vfs.stat('/Home/test.txt');
    expect(meta).not.toBeNull();
    expect(meta!.type).toBe('file');
    expect(meta!.name).toBe('test.txt');
    expect(meta!.size).toBe(7);
  });

  it('stat returns null for missing paths', async () => {
    await vfs.initVFS();

    const meta = await vfs.stat('/nonexistent');
    expect(meta).toBeNull();
  });

  it('copies files', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/original.txt', 'copy me');
    await vfs.copyFile('/Home/original.txt', '/Home/copy.txt');

    expect(await vfs.readFile('/Home/copy.txt')).toBe('copy me');
    expect(await vfs.readFile('/Home/original.txt')).toBe('copy me');
  });

  it('moves files', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/source.txt', 'move me');
    await vfs.movePath('/Home/source.txt', '/Home/dest.txt');

    expect(await vfs.exists('/Home/source.txt')).toBe(false);
    expect(await vfs.readFile('/Home/dest.txt')).toBe('move me');
  });

  it('moves directories with children', async () => {
    await vfs.initVFS();

    await vfs.createDirectory('/Home/folder');
    await vfs.writeFile('/Home/folder/file.txt', 'inside');

    await vfs.movePath('/Home/folder', '/Home/renamed');

    expect(await vfs.exists('/Home/folder')).toBe(false);
    expect(await vfs.exists('/Home/renamed')).toBe(true);
    expect(await vfs.readFile('/Home/renamed/file.txt')).toBe('inside');
  });

  it('writeFile rejects when parent does not exist', async () => {
    await vfs.initVFS();

    await expect(vfs.writeFile('/nonexistent/file.txt', 'fail')).rejects.toThrow('Parent directory not found');
  });

  it('createDirectory rejects when path exists as file', async () => {
    await vfs.initVFS();

    await vfs.writeFile('/Home/file.txt', 'content');
    await expect(vfs.createDirectory('/Home/file.txt')).rejects.toThrow('Already exists as file');
  });

  it('deletePath rejects for missing path', async () => {
    await vfs.initVFS();

    await expect(vfs.deletePath('/nonexistent')).rejects.toThrow('Path not found');
  });

  it('lists root when directory is /Home', async () => {
    await vfs.initVFS();

    const entries = await vfs.listDirectory('/Home');
    const names = entries.map((e) => e.name);
    expect(names).toContain('Documents');
    expect(names).toContain('Downloads');
    expect(names).toContain('Pictures');
    expect(names).toContain('readme.txt');
    expect(names).toContain('notes.md');
  });

  it('existing directory is idempotent', async () => {
    await vfs.initVFS();

    await vfs.createDirectory('/Home/Documents');
    expect(await vfs.exists('/Home/Documents')).toBe(true);
  });
});
