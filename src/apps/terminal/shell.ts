/**
 * Shell command parser and executor.
 *
 * Pure functions — no React or DOM dependencies.
 * This makes the shell logic testable independently of xterm.js.
 */

import {
  listDirectory,
  readFile,
  writeFile,
  createDirectory,
  deletePath,
  exists,
  stat,
  movePath,
  copyFile,
} from '@/storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShellContext {
  cwd: string;
  setCwd: (cwd: string) => void;
  write: (data: string) => void;
  writeError: (data: string) => void;
}

export interface ShellCommand {
  name: string;
  description: string;
  usage?: string;
  execute: (args: string[], ctx: ShellContext) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

export function resolvePath(cwd: string, path: string): string {
  if (path.startsWith('/')) return normalizePath(path);
  if (path === '~' || path.startsWith('~/')) {
    return normalizePath('/Home' + path.slice(1));
  }
  if (path.startsWith('./')) path = path.slice(2);

  const parts = path.split('/');
  const result = cwd === '/' ? [''] : cwd.split('/');
  for (const part of parts) {
    if (part === '..') {
      result.pop();
    } else if (part && part !== '.') {
      result.push(part);
    }
  }
  return normalizePath(result.join('/') || '/');
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return '/' + parts.join('/');
}

// ---------------------------------------------------------------------------
// Built-in commands
// ---------------------------------------------------------------------------

const HELP_TEXT = `Available commands:
  help [cmd]     Show help message (or help for a specific command)
  clear          Clear the terminal
  echo [args]    Echo arguments
  date           Show current date and time
  whoami         Show current user
  uname          Show system information
  pwd            Print working directory
  cd [path]      Change directory
  ls [path]      List directory contents
  cat <file>     Show file contents
  mkdir <dir>    Create directory
  touch <file>   Create empty file
  rm <path>      Delete file or directory
  mv <src> <dst> Move/rename file or directory
  cp <src> <dst> Copy file
  stat <path>    Show file/directory metadata`;

const builtinCommands: ShellCommand[] = [
  {
    name: 'help',
    description: 'Show help message',
    execute(args, ctx) {
      if (args[0]) {
        const cmd = builtinCommands.find((c) => c.name === args[0]);
        if (cmd) {
          ctx.write(`${cmd.name} - ${cmd.description}${cmd.usage ? '\nUsage: ' + cmd.usage : ''}`);
        } else {
          ctx.writeError(`help: no such command: ${args[0]}`);
        }
        return;
      }
      ctx.write(HELP_TEXT);
    },
  },
  {
    name: 'clear',
    description: 'Clear the terminal',
    execute() {
      // Handled by the terminal component — special return value
    },
  },
  {
    name: 'echo',
    description: 'Echo arguments',
    usage: 'echo [args...]',
    execute(args, ctx) {
      ctx.write(args.join(' '));
    },
  },
  {
    name: 'date',
    description: 'Show current date and time',
    execute(_, ctx) {
      ctx.write(new Date().toLocaleString());
    },
  },
  {
    name: 'whoami',
    description: 'Show current user',
    execute(_, ctx) {
      ctx.write('webos-user');
    },
  },
  {
    name: 'uname',
    description: 'Show system information',
    execute(_, ctx) {
      ctx.write('WebOS 1.0.0 - A programmable, multimodal, AI-controllable runtime platform');
    },
  },
  {
    name: 'pwd',
    description: 'Print working directory',
    execute(_, ctx) {
      ctx.write(ctx.cwd);
    },
  },
  {
    name: 'cd',
    description: 'Change directory',
    usage: 'cd [path]',
    async execute(args, ctx) {
      const target = args[0] ? resolvePath(ctx.cwd, args[0]) : '/Home';
      if (await exists(target)) {
        const s = await stat(target);
        if (s?.type === 'directory') {
          ctx.setCwd(target);
        } else {
          ctx.writeError(`cd: not a directory: ${args[0]}`);
        }
      } else {
        ctx.writeError(`cd: no such directory: ${args[0] ?? '/'}`);
      }
    },
  },
  {
    name: 'ls',
    description: 'List directory contents',
    usage: 'ls [path]',
    async execute(args, ctx) {
      const target = args[0] ? resolvePath(ctx.cwd, args[0]) : ctx.cwd;
      const showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al');
      try {
        const entries = await listDirectory(target);
        const filtered = showHidden ? entries : entries.filter((e) => !e.name.startsWith('.'));
        if (filtered.length === 0) {
          ctx.write('(empty)');
        } else {
          const formatted = filtered.map((e) =>
            e.type === 'directory' ? `\x1b[34m${e.name}/\x1b[0m` : e.name,
          );
          ctx.write(formatted.join('  '));
        }
      } catch (err) {
        ctx.writeError(`ls: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'cat',
    description: 'Show file contents',
    usage: 'cat <file>',
    async execute(args, ctx) {
      if (!args[0]) {
        ctx.writeError('cat: missing file operand');
        return;
      }
      try {
        const target = resolvePath(ctx.cwd, args[0]);
        const content = await readFile(target);
        ctx.write(content);
      } catch (err) {
        ctx.writeError(`cat: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'mkdir',
    description: 'Create directory',
    usage: 'mkdir <dir>',
    async execute(args, ctx) {
      if (!args[0]) {
        ctx.writeError('mkdir: missing operand');
        return;
      }
      try {
        const target = resolvePath(ctx.cwd, args[0]);
        await createDirectory(target);
      } catch (err) {
        ctx.writeError(`mkdir: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'touch',
    description: 'Create empty file',
    usage: 'touch <file>',
    async execute(args, ctx) {
      if (!args[0]) {
        ctx.writeError('touch: missing file operand');
        return;
      }
      try {
        const target = resolvePath(ctx.cwd, args[0]);
        if (!(await exists(target))) {
          await writeFile(target, '');
        }
      } catch (err) {
        ctx.writeError(`touch: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'rm',
    description: 'Delete file or directory',
    usage: 'rm <path>',
    async execute(args, ctx) {
      if (!args[0]) {
        ctx.writeError('rm: missing operand');
        return;
      }
      try {
        const target = resolvePath(ctx.cwd, args[0]);
        await deletePath(target);
      } catch (err) {
        ctx.writeError(`rm: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'mv',
    description: 'Move/rename file or directory',
    usage: 'mv <src> <dst>',
    async execute(args, ctx) {
      if (args.length < 2) {
        ctx.writeError('mv: missing operand');
        return;
      }
      try {
        const src = resolvePath(ctx.cwd, args[0]);
        const dst = resolvePath(ctx.cwd, args[1]);
        await movePath(src, dst);
      } catch (err) {
        ctx.writeError(`mv: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'cp',
    description: 'Copy file',
    usage: 'cp <src> <dst>',
    async execute(args, ctx) {
      if (args.length < 2) {
        ctx.writeError('cp: missing operand');
        return;
      }
      try {
        const src = resolvePath(ctx.cwd, args[0]);
        const dst = resolvePath(ctx.cwd, args[1]);
        await copyFile(src, dst);
      } catch (err) {
        ctx.writeError(`cp: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: 'stat',
    description: 'Show file/directory metadata',
    usage: 'stat <path>',
    async execute(args, ctx) {
      if (!args[0]) {
        ctx.writeError('stat: missing operand');
        return;
      }
      try {
        const target = resolvePath(ctx.cwd, args[0]);
        const s = await stat(target);
        if (!s) {
          ctx.writeError(`stat: cannot stat '${args[0]}': No such file or directory`);
          return;
        }
        ctx.write(
          `  Name: ${s.name}\n  Type: ${s.type}\n  Size: ${s.size ?? 0} bytes\n  Modified: ${new Date(s.modified).toLocaleString()}`,
        );
      } catch (err) {
        ctx.writeError(`stat: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Command resolution
// ---------------------------------------------------------------------------

const commandMap = new Map(builtinCommands.map((c) => [c.name, c]));

/** Find a command by name. */
export function getCommand(name: string): ShellCommand | undefined {
  return commandMap.get(name);
}

/** Get all registered command names for tab completion. */
export function getCommandNames(): string[] {
  return Array.from(commandMap.keys());
}

/** Parse a command string into command name and arguments. */
export function parseCommandLine(input: string): { command: string; args: string[] } {
  const trimmed = input.trim();
  if (!trimmed) return { command: '', args: [] };

  // Simple split (doesn't handle quotes — sufficient for now)
  const parts = trimmed.split(/\s+/);
  return { command: parts[0] ?? '', args: parts.slice(1) };
}

// ---------------------------------------------------------------------------
// Tab completion
// ---------------------------------------------------------------------------

/**
 * Complete the current input at cursor position.
 * Returns the completed string, or null if no completion available.
 */
export async function tabComplete(
  input: string,
  cwd: string,
): Promise<string | null> {
  const parts = input.split(/\s+/);

  if (parts.length <= 1) {
    // Completing command names
    const prefix = parts[0]?.toLowerCase() ?? '';
    const matches = getCommandNames().filter((name) => name.startsWith(prefix));
    if (matches.length === 1) {
      return matches[0] + ' ';
    }
    if (matches.length > 1) {
      return matches.join('  ');
    }
    return null;
  }

  // Completing file/directory paths
  const partial = parts[parts.length - 1] ?? '';
  const dirPart = partial.includes('/')
    ? partial.slice(0, partial.lastIndexOf('/') + 1)
    : '';
  const prefix = partial.includes('/')
    ? partial.slice(partial.lastIndexOf('/') + 1)
    : partial;

  const targetDir = dirPart ? resolvePath(cwd, dirPart) : cwd;

  try {
    const entries = await listDirectory(targetDir);
    const matches = entries.filter((e) => e.name.toLowerCase().startsWith(prefix.toLowerCase()));

    if (matches.length === 1) {
      const entry = matches[0];
      const suffix = entry.type === 'directory' ? '/' : ' ';
      const completed = dirPart + entry.name + suffix;
      // Replace last part of input
      parts[parts.length - 1] = completed;
      return parts.join(' ');
    }
    if (matches.length > 1) {
      // Show options
      return matches.map((e) => e.name + (e.type === 'directory' ? '/' : '')).join('  ');
    }
  } catch {
    // Directory doesn't exist, no completion
  }

  return null;
}
