/**
 * Clipboard capability — system clipboard operations.
 */

import { registerCapability } from '../registry';

registerCapability(
  {
    id: 'clipboard',
    name: 'Clipboard',
    version: '1.0.0',
    description: 'System clipboard read/write operations',
    category: 'system',
    permissions: [
      { scope: 'clipboard', description: 'Read and write to the system clipboard' },
    ],
    commands: [
      { id: 'read', label: 'Read Clipboard', description: 'Read text from the system clipboard', permission: 'clipboard' },
      { id: 'write', label: 'Write Clipboard', description: 'Write text to the system clipboard', params: { text: { type: 'string', description: 'Text to copy', required: true } }, permission: 'clipboard' },
      { id: 'clear', label: 'Clear Clipboard', description: 'Clear the system clipboard', permission: 'clipboard' },
    ],
  },
  {
    read: async () => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    },
    write: async ({ text }) => {
      try {
        await navigator.clipboard.writeText(text as string);
        return true;
      } catch {
        return false;
      }
    },
    clear: async () => {
      try {
        await navigator.clipboard.writeText('');
        return true;
      } catch {
        return false;
      }
    },
  },
);
