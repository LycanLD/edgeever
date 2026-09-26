export type MasterBarModeId = "notes" | "commands" | "web" | "notebooks";

export type MasterBarModeDefinition = {
  id: MasterBarModeId;
  prefix: string;
  placeholderKey: string;
  labelKey: string;
  groupKey: string;
  emptyKey: string;
};

/**
 * Mode registry for the Master Bar. Prefixes are matched against the raw
 * input in list order; the default mode (empty prefix) must be last.
 * Add a new entry here to introduce a new Master Bar mode.
 */
export const MASTER_BAR_MODES: readonly MasterBarModeDefinition[] = [
  {
    id: "commands",
    prefix: ">",
    placeholderKey: "masterBar.placeholderCommands",
    labelKey: "masterBar.modeCommands",
    groupKey: "masterBar.groupCommands",
    emptyKey: "masterBar.emptyCommands",
  },
  {
    id: "web",
    prefix: "?",
    placeholderKey: "masterBar.placeholderWeb",
    labelKey: "masterBar.modeWeb",
    groupKey: "masterBar.groupWeb",
    emptyKey: "masterBar.webEmpty",
  },
  {
    id: "notebooks",
    prefix: "#",
    placeholderKey: "masterBar.placeholderNotebooks",
    labelKey: "masterBar.modeNotebooks",
    groupKey: "masterBar.groupNotebooks",
    emptyKey: "masterBar.emptyNotebooks",
  },
  {
    id: "notes",
    prefix: "",
    placeholderKey: "masterBar.placeholderNotes",
    labelKey: "masterBar.modeNotes",
    groupKey: "masterBar.groupNotes",
    emptyKey: "masterBar.emptyNotes",
  },
];

export const DEFAULT_MASTER_BAR_MODE: MasterBarModeDefinition = MASTER_BAR_MODES[MASTER_BAR_MODES.length - 1];

export type MasterBarParsedQuery = {
  mode: MasterBarModeDefinition;
  query: string;
};

export const parseMasterBarQuery = (raw: string): MasterBarParsedQuery => {
  const match = MASTER_BAR_MODES.find((mode) => mode.prefix !== "" && raw.startsWith(mode.prefix));
  if (!match) {
    return { mode: DEFAULT_MASTER_BAR_MODE, query: raw };
  }
  return { mode: match, query: raw.slice(match.prefix.length).trimStart() };
};

export type MasterBarCommandId =
  | "openHome"
  | "createMemo"
  | "createNotebook"
  | "globalSearch"
  | "quickSwitcher"
  | "openSettings"
  | "openTemplates"
  | "openAiPrompts"
  | "openAssets"
  | "openPlugins"
  | "openExecutionCenter"
  | "openTags"
  | "openTrash"
  | "toggleTheme"
  | "toggleFocusMode"
  | "saveAndSync";

export type MasterBarCommandDefinition = {
  id: MasterBarCommandId;
  labelKey: string;
};

export const MASTER_BAR_COMMANDS: readonly MasterBarCommandDefinition[] = [
  { id: "openHome", labelKey: "masterBar.commands.openHome" },
  { id: "createMemo", labelKey: "masterBar.commands.createMemo" },
  { id: "createNotebook", labelKey: "masterBar.commands.createNotebook" },
  { id: "globalSearch", labelKey: "masterBar.commands.globalSearch" },
  { id: "quickSwitcher", labelKey: "masterBar.commands.quickSwitcher" },
  { id: "openSettings", labelKey: "masterBar.commands.openSettings" },
  { id: "openTemplates", labelKey: "masterBar.commands.openTemplates" },
  { id: "openAiPrompts", labelKey: "masterBar.commands.openAiPrompts" },
  { id: "openAssets", labelKey: "masterBar.commands.openAssets" },
  { id: "openPlugins", labelKey: "masterBar.commands.openPlugins" },
  { id: "openExecutionCenter", labelKey: "masterBar.commands.openExecutionCenter" },
  { id: "openTags", labelKey: "masterBar.commands.openTags" },
  { id: "openTrash", labelKey: "masterBar.commands.openTrash" },
  { id: "toggleTheme", labelKey: "masterBar.commands.toggleTheme" },
  { id: "toggleFocusMode", labelKey: "masterBar.commands.toggleFocusMode" },
  { id: "saveAndSync", labelKey: "masterBar.commands.saveAndSync" },
];

export const filterMasterBarCommands = (
  query: string,
  resolveLabel: (command: MasterBarCommandDefinition) => string = (command) => command.id
): MasterBarCommandDefinition[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...MASTER_BAR_COMMANDS];
  }
  return MASTER_BAR_COMMANDS.filter(
    (command) =>
      command.id.toLowerCase().includes(needle) || resolveLabel(command).toLowerCase().includes(needle)
  );
};

export const filterMasterBarNotebooks = <T extends { name: string }>(notebooks: readonly T[], query: string): T[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...notebooks];
  }
  return notebooks.filter((notebook) => notebook.name.toLowerCase().includes(needle));
};

export const buildWebSearchUrl = (query: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
