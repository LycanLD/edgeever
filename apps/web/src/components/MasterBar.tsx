import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Globe, LoaderCircle, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MemoSummary, Notebook } from "@edgeever/shared";
import type { EdgeEverRepository } from "@/lib/repository";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  COMMAND_ITEM_STRONG_SELECTED_CLASS_NAME,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  MASTER_BAR_MODES,
  buildWebSearchUrl,
  filterMasterBarCommands,
  filterMasterBarNotebooks,
  parseMasterBarQuery,
  type MasterBarCommandId,
} from "@/lib/master-bar";

const WEB_RESULT_VALUE = "__master-bar-web__";
const EMPTY_MEMOS: MemoSummary[] = [];

type MasterBarProps = {
  open: boolean;
  query: string;
  repository: EdgeEverRepository;
  notebooks: Notebook[];
  commandRunners: Partial<Record<MasterBarCommandId, () => void>>;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onOpenMemo: (memo: MemoSummary) => void;
  onSelectNotebook: (notebookId: string) => void;
};

export const MasterBar = ({
  open,
  query,
  repository,
  notebooks,
  commandRunners,
  onOpenChange,
  onQueryChange,
  onOpenMemo,
  onSelectNotebook,
}: MasterBarProps) => {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState("");
  const { mode, query: modeQuery } = parseMasterBarQuery(query);
  const deferredModeQuery = useDeferredValue(modeQuery.trim());

  const memoQuery = useQuery({
    queryKey: ["master-bar-notes", deferredModeQuery],
    queryFn: () =>
      repository.listMemos({
        notebookId: null,
        q: deferredModeQuery,
        trash: false,
        filter: "all",
        sort: "updated-desc",
        offset: 0,
        limit: 50,
      }),
    enabled: open && mode.id === "notes",
    staleTime: 15_000,
  });
  const memos = mode.id === "notes" ? memoQuery.data?.memos ?? EMPTY_MEMOS : EMPTY_MEMOS;
  const notesLoading = mode.id === "notes" && (memoQuery.isPending || memoQuery.isFetching);

  const commands = useMemo(
    () => (mode.id === "commands" ? filterMasterBarCommands(modeQuery, (command) => t(command.labelKey)) : []),
    [mode.id, modeQuery, t]
  );
  const visibleNotebooks = useMemo(
    () => (mode.id === "notebooks" ? filterMasterBarNotebooks(notebooks, modeQuery) : []),
    [mode.id, notebooks, modeQuery]
  );
  const showWebResult = mode.id === "web" && modeQuery.trim().length > 0;

  const visibleValues = useMemo(() => {
    if (mode.id === "notes") {
      return memos.map((memo) => memo.id);
    }
    if (mode.id === "commands") {
      return commands.map((command) => command.id);
    }
    if (mode.id === "notebooks") {
      return visibleNotebooks.map((notebook) => notebook.id);
    }
    if (showWebResult) {
      return [WEB_RESULT_VALUE];
    }
    return [];
  }, [mode.id, memos, commands, visibleNotebooks, showWebResult]);

  useEffect(() => {
    if (!visibleValues.includes(selectedValue)) {
      setSelectedValue(visibleValues[0] ?? "");
    }
  }, [visibleValues, selectedValue]);

  const closeBar = () => {
    onOpenChange(false);
    onQueryChange("");
  };

  const runCommand = (commandId: MasterBarCommandId) => {
    const runner = commandRunners[commandId];
    closeBar();
    runner?.();
  };

  const openWebResult = () => {
    const url = buildWebSearchUrl(modeQuery);
    closeBar();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const showEmpty =
    !notesLoading &&
    visibleValues.length === 0 &&
    !(mode.id === "notes" && memoQuery.isPending);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeBar())}>
      <DialogContent className="top-[18%] block max-w-xl translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t("masterBar.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("masterBar.description")}</DialogDescription>
        <Command shouldFilter={false} value={selectedValue} onValueChange={setSelectedValue}>
          <CommandInput
            autoFocus
            className="pr-9"
            placeholder={t(mode.placeholderKey)}
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList className="max-h-[min(26rem,60dvh)] p-1.5">
            {mode.id === "notes" && notesLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {t("quickSwitcher.loading")}
              </div>
            ) : (
              <>
                {showEmpty ? <CommandEmpty>{t(mode.emptyKey)}</CommandEmpty> : null}
                {mode.id === "notes" && memos.length > 0 ? (
                  <CommandGroup heading={t(mode.groupKey)}>
                    {memos.map((memo) => (
                      <CommandItem
                        key={memo.id}
                        className={COMMAND_ITEM_STRONG_SELECTED_CLASS_NAME}
                        value={memo.id}
                        onSelect={() => {
                          closeBar();
                          onOpenMemo(memo);
                        }}
                      >
                        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="truncate font-medium text-slate-900">{memo.title}</div>
                          {memo.excerpt ? (
                            <div className="mt-0.5 truncate text-xs text-slate-500">{memo.excerpt}</div>
                          ) : null}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {mode.id === "commands" && commands.length > 0 ? (
                  <CommandGroup heading={t(mode.groupKey)}>
                    {commands.map((command) => (
                      <CommandItem
                        key={command.id}
                        className={COMMAND_ITEM_STRONG_SELECTED_CLASS_NAME}
                        value={command.id}
                        onSelect={() => runCommand(command.id)}
                      >
                        <Terminal className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{t(command.labelKey)}</span>
                        <CommandShortcut>&gt;</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {mode.id === "notebooks" && visibleNotebooks.length > 0 ? (
                  <CommandGroup heading={t(mode.groupKey)}>
                    {visibleNotebooks.map((notebook) => (
                      <CommandItem
                        key={notebook.id}
                        className={COMMAND_ITEM_STRONG_SELECTED_CLASS_NAME}
                        value={notebook.id}
                        onSelect={() => {
                          closeBar();
                          onSelectNotebook(notebook.id);
                        }}
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1 truncate">{notebook.name}</span>
                        <CommandShortcut>#</CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {showWebResult ? (
                  <CommandGroup heading={t(mode.groupKey)}>
                    <CommandItem
                      className={COMMAND_ITEM_STRONG_SELECTED_CLASS_NAME}
                      value={WEB_RESULT_VALUE}
                      onSelect={openWebResult}
                    >
                      <Globe className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1 truncate">
                        {t("masterBar.webAction", { query: modeQuery })}
                      </span>
                      <CommandShortcut>?</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </>
            )}
          </CommandList>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              {MASTER_BAR_MODES.map((candidate) => (
                <span
                  key={candidate.id}
                  className={cn(
                    "inline-flex items-center gap-1",
                    candidate.id === mode.id && "font-semibold text-slate-700"
                  )}
                >
                  <span className="rounded bg-slate-100 px-1 font-mono text-[11px] text-slate-500">
                    {candidate.prefix || "Aa"}
                  </span>
                  {t(candidate.labelKey)}
                </span>
              ))}
            </span>
            <span className="shrink-0">
              {t("masterBar.openHint")} · {t("masterBar.closeHint")}
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
};

export default MasterBar;
