/**
 * Storage module — re-exports for convenience.
 */

export { initVFS, readFile, writeFile, deletePath, createDirectory, listDirectory, exists, stat, movePath, copyFile, normalizePath, parentPath, baseName } from './vfs';
export type { VFSNode, VFSEntry } from './vfs';
export { saveState, loadState, clearState, persistStore } from './persist';
export { initStorage } from './init';
