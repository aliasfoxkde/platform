/**
 * Storage capability — VFS-backed file operations.
 */

import { registerCapability } from '../registry';
import * as vfs from '../../storage/vfs';

registerCapability(
  {
    id: 'storage',
    name: 'Storage',
    version: '1.0.0',
    description: 'Virtual file system read/write operations',
    category: 'system',
    permissions: [
      { scope: 'storage', description: 'Read and write files in the virtual file system' },
    ],
    commands: [
      { id: 'read', label: 'Read File', description: 'Read file content by path', params: { path: { type: 'string', description: 'File path', required: true } }, permission: 'storage' },
      { id: 'write', label: 'Write File', description: 'Write content to a file', params: { path: { type: 'string', description: 'File path', required: true }, content: { type: 'string', description: 'File content', required: true }, mimeType: { type: 'string', description: 'MIME type' } }, permission: 'storage' },
      { id: 'delete', label: 'Delete Path', description: 'Delete a file or directory', params: { path: { type: 'string', description: 'Path to delete', required: true } }, permission: 'storage' },
      { id: 'list', label: 'List Directory', description: 'List directory contents', params: { path: { type: 'string', description: 'Directory path', required: true } }, permission: 'storage' },
      { id: 'exists', label: 'Path Exists', description: 'Check if a path exists', params: { path: { type: 'string', description: 'Path to check', required: true } }, permission: 'storage' },
      { id: 'mkdir', label: 'Create Directory', description: 'Create a directory', params: { path: { type: 'string', description: 'Directory path', required: true } }, permission: 'storage' },
      { id: 'stat', label: 'Get Metadata', description: 'Get file/directory metadata', params: { path: { type: 'string', description: 'Path', required: true } }, permission: 'storage' },
      { id: 'move', label: 'Move/Rename', description: 'Move or rename a file or directory', params: { from: { type: 'string', description: 'Source path', required: true }, to: { type: 'string', description: 'Destination path', required: true } }, permission: 'storage' },
      { id: 'copy', label: 'Copy File', description: 'Copy a file to a new location', params: { from: { type: 'string', description: 'Source path', required: true }, to: { type: 'string', description: 'Destination path', required: true } }, permission: 'storage' },
    ],
  },
  {
    read: ({ path }) => vfs.readFile(path as string),
    write: ({ path, content, mimeType }) => vfs.writeFile(path as string, content as string, mimeType as string | undefined),
    delete: ({ path }) => vfs.deletePath(path as string),
    list: ({ path }) => vfs.listDirectory(path as string),
    exists: ({ path }) => vfs.exists(path as string),
    mkdir: ({ path }) => vfs.createDirectory(path as string),
    stat: ({ path }) => vfs.stat(path as string),
    move: ({ from, to }) => vfs.movePath(from as string, to as string),
    copy: ({ from, to }) => vfs.copyFile(from as string, to as string),
  },
);
