/**
 * AI Tool Schema — generates OpenAI-compatible function calling schemas
 * from the capability registry.
 */

import { listCapabilities, findCommand } from '../registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** OpenAI function calling tool definition. */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/** Context snapshot for AI awareness. */
export interface AIContext {
  openWindows: { title: string; app: string; state: string }[];
  openApps: string[];
  currentTheme: string;
  capabilities: string[];
  commandCount: number;
}

// ---------------------------------------------------------------------------
// Schema generation
// ---------------------------------------------------------------------------

/** Convert CommandParamSchema to JSON Schema property. */
function paramToJsonProperty(param: {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  default?: unknown;
  enum?: unknown[];
}): unknown {
  const prop: Record<string, unknown> = { type: param.type };
  if (param.description) prop.description = param.description;
  if (param.default !== undefined) prop.default = param.default;
  if (param.enum) prop.enum = param.enum;
  return prop;
}

/**
 * Generate OpenAI-compatible tool definitions from all registered capabilities.
 */
export function generateToolDefinitions(): ToolDefinition[] {
  const capabilities = listCapabilities();
  const tools: ToolDefinition[] = [];

  for (const cap of capabilities) {
    if (!cap.enabled) continue;

    for (const cmd of cap.commands) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      if (cmd.params) {
        for (const [name, param] of Object.entries(cmd.params)) {
          properties[name] = paramToJsonProperty(param);
          if (param.required) required.push(name);
        }
      }

      tools.push({
        type: 'function',
        function: {
          name: `${cap.id}.${cmd.id}`,
          description: cmd.description || cmd.label || `Command ${cmd.id} from ${cap.name}`,
          parameters: {
            type: 'object',
            properties,
            ...(required.length > 0 ? { required } : {}),
          },
        },
      });
    }
  }

  return tools;
}

/**
 * Generate a system prompt with OS context.
 */
export function generateSystemPrompt(context: AIContext): string {
  const lines: string[] = [
    'You are an AI assistant integrated into a WebOS environment. You can help users manage files, control windows, run commands, and automate tasks.',
    '',
    '## Current Environment',
    `- Open apps: ${context.openApps.join(', ') || 'none'}`,
    `- Open windows: ${context.openWindows.length}`,
    `- Theme: ${context.currentTheme}`,
    `- Available capabilities: ${context.capabilities.join(', ') || 'none'}`,
    `- Total commands available: ${context.commandCount}`,
    '',
    '## Capabilities',
    'You have access to tools that let you interact with the WebOS. Use them when the user asks you to perform actions like:',
    '- Reading or writing files',
    '- Opening or closing apps',
    '- Managing system settings',
    '- Running shell commands',
    '',
    'Always be helpful and concise. When using tools, explain what you are doing.',
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Context gathering
// ---------------------------------------------------------------------------

/**
 * Gather current OS context for AI awareness.
 */
export function gatherContext(): AIContext {
  // These imports are done lazily to avoid circular deps at module level
  const { useWindowStore } = require('@/shell/stores/windowStore');
  const { useAppStore } = require('@/shell/stores/appStore');

  // Access store state directly (non-reactive)
  const windowState = (useWindowStore as any).getState?.() ?? {};
  const appState = (useAppStore as any).getState?.() ?? {};

  const openWindows = (windowState.windows ?? []).map((w: any) => ({
    title: w.title ?? 'Untitled',
    app: w.appId ?? 'unknown',
    state: w.minimized ? 'minimized' : w.maximized ? 'maximized' : 'normal',
  }));

  const openApps = [...new Set((windowState.windows ?? []).map((w: any) => w.appId).filter(Boolean))];

  // Get capabilities info
  const capabilities = listCapabilities();
  const capNames = capabilities.filter((c) => c.enabled).map((c) => c.name);
  let commandCount = 0;
  for (const cap of capabilities) {
    if (cap.enabled) commandCount += cap.commands.length;
  }

  return {
    openWindows,
    openApps: openApps.length > 0 ? openApps : appState.apps?.map((a: any) => a.title ?? a.id) ?? [],
    currentTheme: 'dark', // Would need theme store
    capabilities: capNames,
    commandCount,
  };
}

/**
 * Execute a tool call by name.
 * Returns the result or an error message.
 */
export async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const handler = findCommand(name);
  if (!handler) {
    return `Error: Unknown tool "${name}"`;
  }

  try {
    const result = await handler(args);
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  } catch (err) {
    return `Error: ${(err as Error).message}`;
  }
}
