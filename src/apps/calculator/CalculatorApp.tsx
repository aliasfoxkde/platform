import { useState, useCallback, useEffect, useRef } from "react";

type Operation = "+" | "-" | "*" | "/" | "%";

interface CalcState {
  display: string;
  previousValue: string | null;
  operation: Operation | null;
  waitingForOperand: boolean;
  justEvaluated: boolean;
}

const INITIAL_STATE: CalcState = {
  display: "0",
  previousValue: null,
  operation: null,
  waitingForOperand: false,
  justEvaluated: false,
};

const BUTTONS: { label: string; action?: string; span?: number; className?: string }[][] = [
  [
    { label: "C", action: "clear" },
    { label: "CE", action: "clear-entry" },
    { label: "\u232B", action: "backspace" },
    { label: "/", action: "op-/" },
  ],
  [
    { label: "7", action: "digit-7" },
    { label: "8", action: "digit-8" },
    { label: "9", action: "digit-9" },
    { label: "*", action: "op-*" },
  ],
  [
    { label: "4", action: "digit-4" },
    { label: "5", action: "digit-5" },
    { label: "6", action: "digit-6" },
    { label: "-", action: "op--" },
  ],
  [
    { label: "1", action: "digit-1" },
    { label: "2", action: "digit-2" },
    { label: "3", action: "digit-3" },
    { label: "+", action: "op-+" },
  ],
  [
    { label: "+/-", action: "negate" },
    { label: "0", action: "digit-0" },
    { label: ".", action: "decimal" },
    { label: "=", action: "equals" },
  ],
];

export default function CalculatorApp() {
  const [state, setState] = useState<CalcState>(INITIAL_STATE);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAction = useCallback((action: string) => {
    setState((prev) => {
      if (action === "clear") return INITIAL_STATE;

      if (action === "clear-entry") {
        return { ...INITIAL_STATE, previousValue: prev.previousValue, operation: prev.operation };
      }

      if (action === "backspace") {
        if (prev.waitingForOperand || prev.justEvaluated) return prev;
        const next = prev.display.length <= 1 || (prev.display.length === 2 && prev.display.startsWith("-"))
          ? "0"
          : prev.display.slice(0, -1);
        return { ...prev, display: next };
      }

      if (action === "negate") {
        if (prev.display === "0") return prev;
        return {
          ...prev,
          display: prev.display.startsWith("-")
            ? prev.display.slice(1)
            : `-${prev.display}`,
        };
      }

      if (action === "decimal") {
        if (prev.justEvaluated) {
          return { ...INITIAL_STATE, display: "0." };
        }
        if (prev.waitingForOperand) {
          return { ...prev, display: "0.", waitingForOperand: false };
        }
        if (prev.display.includes(".")) return prev;
        return { ...prev, display: `${prev.display}.` };
      }

      if (action.startsWith("digit-")) {
        const digit = action.slice(6);
        if (prev.justEvaluated) {
          return { ...INITIAL_STATE, display: digit };
        }
        if (prev.waitingForOperand) {
          return { ...prev, display: digit, waitingForOperand: false };
        }
        return {
          ...prev,
          display: prev.display === "0" ? digit : `${prev.display}${digit}`,
        };
      }

      if (action.startsWith("op-")) {
        const op = action.slice(3) as Operation;

        if (prev.previousValue !== null && prev.operation && !prev.waitingForOperand) {
          const result = evaluate(parseFloat(prev.previousValue), parseFloat(prev.display), prev.operation);
          const resultStr = formatNumber(result);
          return {
            display: resultStr,
            previousValue: resultStr,
            operation: op,
            waitingForOperand: true,
            justEvaluated: false,
          };
        }

        return {
          ...prev,
          previousValue: prev.display,
          operation: op,
          waitingForOperand: true,
          justEvaluated: false,
        };
      }

      if (action === "equals") {
        if (prev.previousValue === null || !prev.operation) return prev;
        const result = evaluate(parseFloat(prev.previousValue), parseFloat(prev.display), prev.operation);
        const resultStr = formatNumber(result);
        return {
          display: resultStr,
          previousValue: null,
          operation: null,
          waitingForOperand: false,
          justEvaluated: true,
        };
      }

      return prev;
    });
  }, []);

  /* Keyboard support */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Only handle when this component is focused/visible
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current) return;

      const key = e.key;

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        handleAction(`digit-${key}`);
      } else if (key === ".") {
        e.preventDefault();
        handleAction("decimal");
      } else if (key === "+") {
        e.preventDefault();
        handleAction("op-+");
      } else if (key === "-") {
        e.preventDefault();
        handleAction("op--");
      } else if (key === "*") {
        e.preventDefault();
        handleAction("op-*");
      } else if (key === "/") {
        e.preventDefault();
        handleAction("op-/");
      } else if (key === "%") {
        e.preventDefault();
        handleAction("op-%");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleAction("equals");
      } else if (key === "Backspace") {
        e.preventDefault();
        handleAction("backspace");
      } else if (key === "Escape") {
        e.preventDefault();
        handleAction("clear");
      } else if (key === "Delete") {
        e.preventDefault();
        handleAction("clear-entry");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAction]);

  const operationSymbol: Record<Operation, string> = {
    "+": "+",
    "-": "\u2212",
    "*": "\u00D7",
    "/": "\u00F7",
    "%": "%",
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col overflow-hidden bg-[hsl(var(--background))] p-3"
      tabIndex={0}
    >
      {/* Display */}
      <div className="mb-3 shrink-0 rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <div className="min-h-[1.25rem] text-right text-xs text-[hsl(var(--muted-foreground))]">
          {state.previousValue !== null && state.operation
            ? `${state.previousValue} ${operationSymbol[state.operation]}`
            : "\u00A0"}
        </div>
        <div className="truncate text-right text-3xl font-semibold tabular-nums text-[hsl(var(--foreground))]">
          {state.display}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-1 flex-col gap-1.5">
        {BUTTONS.map((row, ri) => (
          <div key={ri} className="flex flex-1 gap-1.5">
            {row.map((btn) => {
              const isOperator = btn.action?.startsWith("op-") || btn.action === "equals";
              const isAction =
                btn.action === "clear" ||
                btn.action === "clear-entry" ||
                btn.action === "backspace" ||
                btn.action === "negate";

              return (
                <button
                  key={btn.label}
                  onClick={() => btn.action && handleAction(btn.action)}
                  className={`flex flex-1 cursor-pointer items-center justify-center rounded-[var(--radius)] text-base font-medium transition-colors duration-[var(--transition)] ${
                    isOperator
                      ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:brightness-110 active:brightness-90"
                      : isAction
                        ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border-bright))] active:brightness-90"
                        : "bg-[hsl(var(--surface-bright))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] active:brightness-90"
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function evaluate(a: number, b: number, op: Operation): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b !== 0 ? a / b : NaN;
    case "%":
      return a % b;
  }
}

function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error";
  const str = String(n);
  // Avoid overly long decimals
  if (str.includes(".") && str.length > 12) {
    return parseFloat(n.toPrecision(10)).toString();
  }
  return str;
}
