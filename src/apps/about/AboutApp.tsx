const TECH_STACK = [
  { name: "React", color: "#61DAFB" },
  { name: "TypeScript", color: "#3178C6" },
  { name: "Vite", color: "#646CFF" },
  { name: "Tailwind CSS", color: "#06B6D4" },
] as const;

export default function AboutApp() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto bg-[hsl(var(--background))] p-6">
      {/* Logo */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] shadow-lg">
        <span className="text-4xl font-bold text-white">W</span>
      </div>

      {/* Title & version */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
          WebOS
        </h1>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Version 0.1.0
        </p>
      </div>

      {/* Description */}
      <p className="max-w-md text-center text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        A programmable, multimodal, AI-controllable runtime platform for the
        web.
      </p>

      {/* Tech stack badges */}
      <div className="flex flex-wrap justify-center gap-2">
        {TECH_STACK.map((tech) => (
          <span
            key={tech.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-1 text-xs font-medium text-[hsl(var(--foreground))]"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: tech.color }}
            />
            {tech.name}
          </span>
        ))}
      </div>

      {/* Links */}
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-sm text-[hsl(var(--accent))] underline decoration-[hsl(var(--accent)/0.3)] underline-offset-2 transition-colors duration-[var(--transition)] hover:decoration-[hsl(var(--accent))]"
      >
        GitHub
      </a>
    </div>
  );
}
