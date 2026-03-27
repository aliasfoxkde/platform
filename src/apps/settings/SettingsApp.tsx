import { useState } from "react";
import type { ThemeMode } from "@/shell/types";

const ACCENT_COLORS = [
  { name: "Blue", hsl: "217 91% 60%" },
  { name: "Purple", hsl: "262 83% 58%" },
  { name: "Green", hsl: "142 71% 45%" },
  { name: "Orange", hsl: "24 95% 53%" },
  { name: "Red", hsl: "0 84% 60%" },
] as const;

type SettingsSection = "appearance" | "display" | "about";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "display", label: "Display" },
  { id: "about", label: "About" },
];

export default function SettingsApp() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (document.documentElement.getAttribute("data-theme") as ThemeMode) ?? "dark";
  });

  const [accentColor, setAccentColor] = useState(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
  });

  function applyTheme(mode: ThemeMode) {
    setTheme(mode);
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }

  function applyAccent(hsl: string) {
    setAccentColor(hsl);
    document.documentElement.style.setProperty("--accent", hsl);
  }

  return (
    <div className="flex h-full w-full overflow-hidden text-sm">
      {/* Sidebar */}
      <nav className="flex w-48 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <div className="px-4 py-3 font-semibold text-[hsl(var(--foreground))]">
          Settings
        </div>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`cursor-pointer px-4 py-2 text-left transition-colors duration-[var(--transition)] ${
              activeSection === s.id
                ? "bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--background))] p-6">
        {activeSection === "appearance" && (
          <AppearanceSection
            theme={theme}
            onThemeChange={applyTheme}
            accentColor={accentColor}
            onAccentChange={applyAccent}
          />
        )}
        {activeSection === "display" && <DisplaySection />}
        {activeSection === "about" && <AboutSection />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Appearance                                                                  */
/* -------------------------------------------------------------------------- */

function AppearanceSection({
  theme,
  onThemeChange,
  accentColor,
  onAccentChange,
}: {
  theme: ThemeMode;
  onThemeChange: (m: ThemeMode) => void;
  accentColor: string;
  onAccentChange: (hsl: string) => void;
}) {
  const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "dark", label: "Dark", icon: "\u{1F319}" },
    { value: "light", label: "Light", icon: "\u{2600}\u{FE0F}" },
    { value: "system", label: "System", icon: "\u{1F4BB}" },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
        Appearance
      </h2>

      {/* Theme */}
      <fieldset className="space-y-3">
        <legend className="font-medium text-[hsl(var(--surface-foreground))]">
          Theme
        </legend>
        <div className="flex gap-3">
          {themeOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-lg)] border p-4 transition-colors duration-[var(--transition)] ${
                theme === opt.value
                  ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.1)]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--surface))] hover:border-[hsl(var(--border-bright))]"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={theme === opt.value}
                onChange={() => onThemeChange(opt.value)}
                className="sr-only"
              />
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Accent color */}
      <fieldset className="space-y-3">
        <legend className="font-medium text-[hsl(var(--surface-foreground))]">
          Accent Color
        </legend>
        <div className="flex gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => onAccentChange(c.hsl)}
              title={c.name}
              className={`h-8 w-8 rounded-full border-2 transition-transform duration-[var(--transition)] hover:scale-110 ${
                accentColor === c.hsl
                  ? "border-[hsl(var(--foreground))]"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: `hsl(${c.hsl})` }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Display                                                                     */
/* -------------------------------------------------------------------------- */

function DisplaySection() {
  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
        Display
      </h2>

      <div className="space-y-4 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--surface-foreground))]">
            Wallpaper
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Default
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--surface-foreground))]">
            Icon Size
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Medium
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--surface-foreground))]">
            Dock Position
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Bottom
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[hsl(var(--surface-foreground))]">
            Animations
          </span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Enabled
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* About                                                                       */
/* -------------------------------------------------------------------------- */

function AboutSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">
        About
      </h2>

      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6">
        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-3xl text-white">
          W
        </div>
        <div className="text-center">
          <p className="font-semibold text-[hsl(var(--foreground))]">WebOS</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Version 0.1.0
          </p>
        </div>
        <p className="max-w-sm text-center text-sm text-[hsl(var(--muted-foreground))]">
          A programmable, multimodal, AI-controllable runtime platform for the
          web.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["React", "TypeScript", "Vite", "Tailwind CSS"].map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs text-[hsl(var(--muted-foreground))]"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
