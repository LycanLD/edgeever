import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const css = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");

describe("M3 foundation tokens", () => {
  test("defines the M3 shape scale on a 16px base", () => {
    expect(css).toContain("--radius: 1rem;");
    expect(css).toContain("--radius-md: calc(var(--radius) - 4px);");
    expect(css).toContain("--radius-sm: calc(var(--radius) - 8px);");
    expect(css).toContain("--radius-2xl: calc(var(--radius) + 12px);");
    expect(css).toContain("--edgeever-theme-radius, 1rem");
  });

  test("exposes M3 color roles as Tailwind color bridges", () => {
    expect(css).toContain("--color-primary-container: hsl(var(--primary-container));");
    expect(css).toContain("--color-on-primary-container: hsl(var(--on-primary-container));");
    expect(css).toContain("--color-secondary-container: hsl(var(--secondary-container));");
    expect(css).toContain("--color-surface-container-high: var(--surface-container-high);");
    expect(css).toContain("--color-on-surface: hsl(var(--on-surface));");
    expect(css).toContain("--color-outline: hsl(var(--outline));");
  });

  test("defines surface-container ladders for light and dark schemes", () => {
    expect(css).toContain("--surface-container-low: #f4f6f8;");
    expect(css).toContain("--surface-container-high: #e7ebef;");
    expect(css).toContain("--surface-container-lowest: #0d0f12;");
    expect(css).toContain("--surface-container-highest: #191c21;");
    expect(css.indexOf("--surface-container-high: #e7ebef;")).toBeLessThan(
      css.indexOf("--surface-container-high: #15181c;"),
    );
  });

  test("defines M3 motion curves and duration ladder", () => {
    expect(css).toContain("--motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);");
    expect(css).toContain("--motion-ease-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);");
    expect(css).toContain("--motion-ease-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);");
    expect(css).toContain("--motion-duration-short1: 50ms;");
    expect(css).toContain("--motion-duration-short2: 100ms;");
    expect(css).toContain("--motion-duration-medium1: 200ms;");
    expect(css).toContain("--motion-duration-medium2: 300ms;");
    expect(css).toContain("--motion-duration-long: 500ms;");
    expect(css).toContain("--ease-standard: var(--motion-ease-standard);");
  });

  test("defines elevation tokens and utility bridges for both schemes", () => {
    expect(css).toContain("--shadow-elev-1: var(--elev-1);");
    expect(css).toContain("--shadow-elev-2: var(--elev-2);");
    expect(css).toContain("--shadow-elev-3: var(--elev-3);");
    const light = css.indexOf("--elev-1: 0 1px 2px rgb(2 132 199 / 0.08)");
    const dark = css.indexOf("--elev-1: 0 1px 2px rgb(0 0 0 / 0.40)");
    expect(light).toBeGreaterThan(-1);
    expect(dark).toBeGreaterThan(light);
  });

  test("provides the M3 state-layer machinery with reduced-motion support", () => {
    expect(css).toContain(".m3-state::after {");
    expect(css).toContain("opacity: 0.08;");
    expect(css).toContain("opacity: 0.12;");
    expect(css).toContain("border-radius: inherit;");
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*\.m3-state::after/);
  });

  test("keeps the pinned palette/token lines intact", () => {
    expect(css).toContain("--brand-green: #0284c7;");
    expect(css).toContain("--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);");
    expect(css).toContain("--radius-mobile-sheet: 10px;");
    expect(css).toContain("--color-emerald-500: rgb(var(--brand-green-500-rgb) / 1);");
  });
});
