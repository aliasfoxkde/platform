# WebOS

A programmable, multimodal, AI-controllable runtime platform for the web.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Zustand. Deployed to Cloudflare Pages.

## Quick Start

```bash
npm install
npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run deploy` | Deploy to Cloudflare Pages |

## Architecture

WebOS is structured as a runtime platform, not just a frontend app. Every capability is a function, every UI is a projection, and every interaction maps to the same command system.

```
Shell Layer       → Desktop, Windows, Dock, Command Palette
Capability Layer → Apps, Commands, Permissions
Data Layer       → IndexedDB (local-first), optional sync
Automation Layer  → Command Bus, Task Queue, AI Orchestration
Extension Layer   → Plugins, Themes, Marketplace
```

## License

MIT
