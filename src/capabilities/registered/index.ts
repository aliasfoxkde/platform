/**
 * Register all built-in capabilities.
 *
 * Importing this module side-effects registration of:
 * - storage   — VFS file operations
 * - clipboard — system clipboard
 * - notification — toast notifications
 * - window    — window management
 */

import './storage';
import './clipboard';
import './notification';
import './window';
