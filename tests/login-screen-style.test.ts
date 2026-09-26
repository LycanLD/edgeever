import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const loginScreen = readFileSync(new URL("../apps/web/src/components/LoginScreen.tsx", import.meta.url), "utf8");

describe("login screen chrome", () => {
  test("keeps the corner brand wash and the blended mascot backdrop", () => {
    expect(loginScreen).toContain("radial-gradient");
    expect(loginScreen).toContain("mix-blend-screen");
    expect(loginScreen).toContain("invert");
    expect(loginScreen).toContain("bottom-0 right-0");
    expect(loginScreen).toContain("login/boykisser-dance.webm");
    expect(loginScreen).toContain("prefers-reduced-motion");
  });

  test("renders the app icon and uses M3 elevation tokens instead of hand-rolled shadows", () => {
    expect(loginScreen).toContain('getAppAssetPath("favicon.svg"');
    expect(loginScreen).toMatch(/shadow-elev-\d/);
    expect(loginScreen).not.toMatch(/shadow-\[/);
    expect(loginScreen).toContain("rounded-3xl");
  });

  test("does not use inverted-token card shadows", () => {
    expect(loginScreen).toMatch(/backdrop-blur/);
    expect(loginScreen).not.toContain("slate-900-rgb");
  });

  test("accepts instance hosts without a protocol", () => {
    expect(loginScreen).toContain("normalizeInstanceUrl");
    expect(loginScreen).toContain('inputMode="url"');
    expect(loginScreen).not.toContain('type="url"');
  });
});
