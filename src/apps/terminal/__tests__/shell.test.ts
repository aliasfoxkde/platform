// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetVFS } from '@/storage/vfs';
import { initVFS } from '@/storage/vfs';
import {
  parseCommandLine,
  resolvePath,
  getCommand,
  getCommandNames,
  tabComplete,
} from '../shell';

let cwd = '/Home';
const output: string[] = [];
const errors: string[] = [];

function ctx() {
  return {
    get cwd() { return cwd; },
    setCwd(c: string) { cwd = c; },
    write(data: string) { output.push(data); },
    writeError(data: string) { errors.push(data); },
  };
}

beforeEach(async () => {
  resetVFS();
  await initVFS();
  cwd = '/Home';
  output.length = 0;
  errors.length = 0;
});

describe('parseCommandLine', () => {
  it('parses empty input', () => {
    const result = parseCommandLine('');
    expect(result.command).toBe('');
    expect(result.args).toEqual([]);
  });

  it('parses whitespace input', () => {
    const result = parseCommandLine('   ');
    expect(result.command).toBe('');
    expect(result.args).toEqual([]);
  });

  it('parses a simple command', () => {
    const result = parseCommandLine('ls');
    expect(result.command).toBe('ls');
    expect(result.args).toEqual([]);
  });

  it('parses command with arguments', () => {
    const result = parseCommandLine('cat /Home/file.txt');
    expect(result.command).toBe('cat');
    expect(result.args).toEqual(['/Home/file.txt']);
  });

  it('parses command with multiple arguments', () => {
    const result = parseCommandLine('echo hello world');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello', 'world']);
  });
});

describe('resolvePath', () => {
  it('resolves absolute paths', () => {
    expect(resolvePath('/Home', '/Documents')).toBe('/Documents');
  });

  it('resolves relative paths', () => {
    expect(resolvePath('/Home', 'Documents')).toBe('/Home/Documents');
  });

  it('resolves dot segments', () => {
    expect(resolvePath('/Home/Documents', '..')).toBe('/Home');
  });

  it('resolves dot-dot with multiple segments', () => {
    expect(resolvePath('/Home/Documents/Work', '../Notes')).toBe('/Home/Documents/Notes');
  });

  it('resolves tilde to Home', () => {
    expect(resolvePath('/any', '~')).toBe('/Home');
    expect(resolvePath('/any', '~/Documents')).toBe('/Home/Documents');
  });

  it('resolves dot slash', () => {
    expect(resolvePath('/Home', './Documents')).toBe('/Home/Documents');
  });

  it('normalizes double slashes', () => {
    expect(resolvePath('/Home', 'Documents//file')).toBe('/Home/Documents/file');
  });
});

describe('getCommand', () => {
  it('finds built-in commands', () => {
    expect(getCommand('ls')).toBeDefined();
    expect(getCommand('cd')).toBeDefined();
    expect(getCommand('cat')).toBeDefined();
  });

  it('returns undefined for unknown commands', () => {
    expect(getCommand('nonexistent')).toBeUndefined();
  });
});

describe('getCommandNames', () => {
  it('returns all built-in command names', () => {
    const names = getCommandNames();
    expect(names).toContain('ls');
    expect(names).toContain('cd');
    expect(names).toContain('cat');
    expect(names).toContain('echo');
    expect(names).toContain('help');
    expect(names).toContain('clear');
  });
});

describe('built-in commands', () => {
  it('echo outputs arguments', async () => {
    const cmd = getCommand('echo')!;
    await cmd.execute(['hello', 'world'], ctx());
    expect(output).toEqual(['hello world']);
  });

  it('pwd prints working directory', async () => {
    const cmd = getCommand('pwd')!;
    await cmd.execute([], ctx());
    expect(output).toEqual(['/Home']);
  });

  it('whoami returns user', async () => {
    const cmd = getCommand('whoami')!;
    await cmd.execute([], ctx());
    expect(output).toEqual(['webos-user']);
  });

  it('date returns a string', async () => {
    const cmd = getCommand('date')!;
    await cmd.execute([], ctx());
    expect(output).toHaveLength(1);
    expect(output[0].length).toBeGreaterThan(0);
  });

  it('help shows all commands', async () => {
    const cmd = getCommand('help')!;
    await cmd.execute([], ctx());
    expect(output).toHaveLength(1);
    expect(output[0]).toContain('ls');
    expect(output[0]).toContain('cd');
  });

  it('help shows specific command', async () => {
    const cmd = getCommand('help')!;
    await cmd.execute(['ls'], ctx());
    expect(output).toHaveLength(1);
    expect(output[0]).toContain('List directory contents');
  });

  it('help reports unknown command', async () => {
    const cmd = getCommand('help')!;
    await cmd.execute(['nonexistent'], ctx());
    expect(errors).toHaveLength(1);
  });
});

describe('VFS commands', () => {
  it('mkdir creates a directory', async () => {
    const cmd = getCommand('mkdir')!;
    await cmd.execute(['testdir'], ctx());
    expect(errors).toHaveLength(0);
  });

  it('mkdir reports missing operand', async () => {
    const cmd = getCommand('mkdir')!;
    await cmd.execute([], ctx());
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('missing operand');
  });

  it('touch creates a file', async () => {
    const cmd = getCommand('touch')!;
    await cmd.execute(['testfile.txt'], ctx());
    expect(errors).toHaveLength(0);
  });

  it('touch reports missing operand', async () => {
    const cmd = getCommand('touch')!;
    await cmd.execute([], ctx());
    expect(errors).toHaveLength(1);
  });

  it('ls lists directory contents', async () => {
    const mkdir = getCommand('mkdir')!;
    await mkdir.execute(['mydir'], ctx());
    const touch = getCommand('touch')!;
    await touch.execute(['myfile.txt'], ctx());

    output.length = 0;
    const ls = getCommand('ls')!;
    await ls.execute([], ctx());
    expect(output).toHaveLength(1);
    expect(output[0]).toContain('mydir');
    expect(output[0]).toContain('myfile.txt');
  });

  it('ls reports error for nonexistent path', async () => {
    const cmd = getCommand('ls')!;
    await cmd.execute(['/nonexistent'], ctx());
    expect(errors).toHaveLength(1);
  });

  it('cat reads file contents', async () => {
    const touch = getCommand('touch')!;
    await touch.execute(['hello.txt'], ctx());
    const { writeFile } = await import('@/storage/vfs');
    await writeFile('/Home/hello.txt', 'Hello, World!');

    output.length = 0;
    const cat = getCommand('cat')!;
    await cat.execute(['hello.txt'], ctx());
    expect(output).toEqual(['Hello, World!']);
  });

  it('cat reports missing operand', async () => {
    const cmd = getCommand('cat')!;
    await cmd.execute([], ctx());
    expect(errors).toHaveLength(1);
  });

  it('cd changes directory', async () => {
    const mkdir = getCommand('mkdir')!;
    await mkdir.execute(['projects'], ctx());

    const cd = getCommand('cd')!;
    await cd.execute(['projects'], ctx());
    expect(cwd).toBe('/Home/projects');
  });

  it('cd to Home with no args', async () => {
    cwd = '/Home/Documents';
    const cd = getCommand('cd')!;
    await cd.execute([], ctx());
    expect(cwd).toBe('/Home');
  });

  it('cd reports error for nonexistent directory', async () => {
    const cd = getCommand('cd')!;
    await cd.execute(['/nonexistent'], ctx());
    expect(errors).toHaveLength(1);
    expect(cwd).toBe('/Home');
  });

  it('rm deletes a file', async () => {
    const touch = getCommand('touch')!;
    await touch.execute(['todelete.txt'], ctx());

    const rm = getCommand('rm')!;
    await rm.execute(['todelete.txt'], ctx());

    output.length = 0;
    const ls = getCommand('ls')!;
    await ls.execute([], ctx());
    expect(output[0]).not.toContain('todelete.txt');
  });

  it('rm reports missing operand', async () => {
    const cmd = getCommand('rm')!;
    await cmd.execute([], ctx());
    expect(errors).toHaveLength(1);
  });

  it('stat shows file metadata', async () => {
    const touch = getCommand('touch')!;
    await touch.execute(['test.txt'], ctx());

    const stat = getCommand('stat')!;
    await stat.execute(['test.txt'], ctx());
    expect(output).toHaveLength(1);
    expect(output[0]).toContain('Name: test.txt');
    expect(output[0]).toContain('Type: file');
  });

  it('stat reports missing operand', async () => {
    const cmd = getCommand('stat')!;
    await cmd.execute([], ctx());
    expect(errors).toHaveLength(1);
  });
});

describe('tabComplete', () => {
  it('completes command names', async () => {
    const result = await tabComplete('ec', '/Home');
    expect(result).toBe('echo ');
  });

  it('returns null when no command match', async () => {
    const result = await tabComplete('zzz', '/Home');
    expect(result).toBeNull();
  });

  it('shows multiple matches for command prefix', async () => {
    const result = await tabComplete('c', '/Home');
    expect(result).toContain('cat');
    expect(result).toContain('cd');
    expect(result).toContain('clear');
    expect(result).toContain('cp');
  });
});
