import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_MASTER_BAR_MODE,
  MASTER_BAR_COMMANDS,
  MASTER_BAR_MODES,
  buildWebSearchUrl,
  filterMasterBarCommands,
  filterMasterBarNotebooks,
  parseMasterBarQuery,
} from "./master-bar.ts";
import { DEFAULT_SHORTCUT_SETTINGS } from "./app-helpers.ts";

describe("master bar modes", () => {
  test("registers unique prefixes with notes as the default trailing mode", () => {
    const prefixes = MASTER_BAR_MODES.map((mode) => mode.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    expect(DEFAULT_MASTER_BAR_MODE.id).toBe("notes");
    expect(DEFAULT_MASTER_BAR_MODE.prefix).toBe("");
    expect(MASTER_BAR_MODES[MASTER_BAR_MODES.length - 1]).toBe(DEFAULT_MASTER_BAR_MODE);
    for (const mode of MASTER_BAR_MODES) {
      expect(mode.placeholderKey.startsWith("masterBar.")).toBe(true);
      expect(mode.labelKey.startsWith("masterBar.")).toBe(true);
      expect(mode.groupKey.startsWith("masterBar.")).toBe(true);
      expect(mode.emptyKey.startsWith("masterBar.")).toBe(true);
    }
  });

  test("routes prefixed input to its mode and keeps everything else on notes", () => {
    expect(parseMasterBarQuery("hello")).toEqual({ mode: DEFAULT_MASTER_BAR_MODE, query: "hello" });
    expect(parseMasterBarQuery(" >x")).toEqual({ mode: DEFAULT_MASTER_BAR_MODE, query: " >x" });
    expect(parseMasterBarQuery("!bang")).toEqual({ mode: DEFAULT_MASTER_BAR_MODE, query: "!bang" });

    const commands = parseMasterBarQuery("> toggle theme");
    expect(commands.mode.id).toBe("commands");
    expect(commands.query).toBe("toggle theme");
    const bareCommands = parseMasterBarQuery(">");
    expect(bareCommands.mode.id).toBe("commands");
    expect(bareCommands.query).toBe("");

    const web = parseMasterBarQuery("?how to scale self-hosting");
    expect(web.mode.id).toBe("web");
    expect(web.query).toBe("how to scale self-hosting");
    expect(parseMasterBarQuery("?").mode.id).toBe("web");

    const notebooks = parseMasterBarQuery("#work");
    expect(notebooks.mode.id).toBe("notebooks");
    expect(notebooks.query).toBe("work");
  });
});

describe("master bar command registry", () => {
  test("keeps command ids unique and namespaced under masterBar.commands", () => {
    const ids = MASTER_BAR_COMMANDS.map((command) => command.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const command of MASTER_BAR_COMMANDS) {
      expect(command.labelKey).toBe(`masterBar.commands.${command.id}`);
    }
  });

  test("filters commands by id or by resolved label", () => {
    expect(filterMasterBarCommands("").length).toBe(MASTER_BAR_COMMANDS.length);
    const byId = filterMasterBarCommands("settings");
    expect(byId.map((command) => command.id)).toContain("openSettings");
    expect(filterMasterBarCommands("no-such-command")).toEqual([]);
    const byLabel = filterMasterBarCommands("закрыть", (command) =>
      command.id === "openTrash" ? "закрыть корзину" : "other"
    );
    expect(byLabel.map((command) => command.id)).toEqual(["openTrash"]);
  });
});

describe("master bar notebook filtering", () => {
  const notebooks = [{ name: "Work" }, { name: "Personal" }, { name: "Archive" }];

  test("returns every notebook for an empty query", () => {
    expect(filterMasterBarNotebooks(notebooks, "")).toEqual(notebooks);
    expect(filterMasterBarNotebooks(notebooks, "   ")).toEqual(notebooks);
  });

  test("matches notebook names case-insensitively", () => {
    expect(filterMasterBarNotebooks(notebooks, "per").map((notebook) => notebook.name)).toEqual(["Personal"]);
    expect(filterMasterBarNotebooks(notebooks, "NOPE")).toEqual([]);
  });
});

describe("master bar web search", () => {
  test("builds an encoded Google search url", () => {
    expect(buildWebSearchUrl("hello world")).toBe("https://www.google.com/search?q=hello%20world");
    expect(buildWebSearchUrl(" a&b ")).toBe("https://www.google.com/search?q=a%26b");
  });
});

describe("master bar shortcut wiring", () => {
  test("defaults to Ctrl+Alt+Space", () => {
    expect(DEFAULT_SHORTCUT_SETTINGS.openMasterBar).toEqual({
      key: "space",
      ctrlOrMeta: true,
      shift: false,
      alt: true,
    });
  });

  test("wires the Master Bar into the workspace shell", () => {
    const workspace = readFileSync(
      fileURLToPath(new URL("../components/WorkspaceApp.tsx", import.meta.url)),
      "utf8"
    );
    expect(workspace).toContain("<MasterBar");
    expect(workspace).toContain('action === "openMasterBar"');
    expect(workspace).toContain("onSelectNotebook={handleSelectNotebook}");
    expect(workspace).toContain("setMasterBarOpen(true)");
  });
});
