import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, CircleAlert, Loader2, TagPlus, Tags, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeTags, type TagSummary } from "@edgeever/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogEmptyState,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api, ApiRequestError } from "@/lib/api";
import { cn, parseTagsText } from "@/lib/utils";

type EditorTagPickerProps = {
  contentMarkdown: string;
  disabled: boolean;
  loadTags: () => Promise<{ tags: TagSummary[] }>;
  title: string;
  value: string;
  onChange: (value: string) => void;
};

type AiGenerationStatus =
  | { kind: "idle" }
  | { kind: "success"; count: number }
  | { kind: "empty" }
  | { kind: "error"; message: string };

export const EditorTagPicker = ({ contentMarkdown, disabled, loadTags, title, value, onChange }: EditorTagPickerProps) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [aiStatus, setAiStatus] = useState<AiGenerationStatus>({ kind: "idle" });
  const [suggesting, setSuggesting] = useState(false);
  const suggestionControllerRef = useRef<AbortController | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTags = useMemo(() => normalizeTags(parseTagsText(value)), [value]);
  const selectedTagKeys = useMemo(
    () => new Set(selectedTags.map((tag) => tag.toLocaleLowerCase())),
    [selectedTags],
  );
  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: loadTags,
    enabled: open,
  });
  const normalizedQuery = query.trim().replace(/^#/, "");
  const visibleTags = (tagsQuery.data?.tags ?? []).filter((tag) =>
    tag.name.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase())
  );
  const exactMatch = (tagsQuery.data?.tags ?? []).some(
    (tag) => tag.name.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase()
  );

  useEffect(() => () => {
    suggestionControllerRef.current?.abort();
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
  }, []);

  const commit = (tags: string[]) => onChange(normalizeTags(tags).join(", "));
  const toggleTag = (name: string) => {
    commit(selectedTags.includes(name)
      ? selectedTags.filter((tag) => tag !== name)
      : [...selectedTags, name]);
  };
  const createTag = () => {
    const additions = parseTagsText(normalizedQuery);
    if (additions.length === 0) return;
    commit([...selectedTags, ...additions]);
    setQuery("");
  };
  const resetAiStatusLater = () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setAiStatus({ kind: "idle" });
      feedbackTimerRef.current = null;
    }, 4000);
  };
  const generateAndApplyTags = async () => {
    if (!title.trim() && !contentMarkdown.trim()) return;
    suggestionControllerRef.current?.abort();
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    const controller = new AbortController();
    suggestionControllerRef.current = controller;
    setSuggesting(true);
    setAiStatus({ kind: "idle" });
    try {
      const result = await api.suggestAiTags(
        {
          title,
          contentMarkdown,
          currentTags: selectedTags,
          locale: i18n.resolvedLanguage,
        },
        controller.signal,
      );
      const availableSlots = Math.max(0, 24 - selectedTags.length);
      const additions = result.suggestions
        .filter((suggestion) => !selectedTagKeys.has(suggestion.name.toLocaleLowerCase()))
        .slice(0, availableSlots)
        .map((suggestion) => suggestion.name);
      if (additions.length > 0) {
        commit([...selectedTags, ...additions]);
        setAiStatus({ kind: "success", count: additions.length });
      } else {
        setAiStatus({ kind: "empty" });
      }
      resetAiStatusLater();
    } catch (error) {
      if (controller.signal.aborted) return;
      setAiStatus({
        kind: "error",
        message:
        error instanceof ApiRequestError && error.code === "ai_not_configured"
          ? t("editor.tagPicker.aiConfigure")
          : error instanceof Error
            ? error.message
            : t("editor.tagPicker.aiFailed"),
      });
    } finally {
      if (suggestionControllerRef.current === controller) {
        suggestionControllerRef.current = null;
        setSuggesting(false);
      }
    }
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) return;
    setQuery("");
  };
  const aiLabel = suggesting
    ? t("editor.tagPicker.aiGenerating")
    : aiStatus.kind === "success"
      ? t("editor.tagPicker.aiAdded", { count: aiStatus.count })
      : aiStatus.kind === "empty"
        ? t("editor.tagPicker.aiEmptyShort")
        : aiStatus.kind === "error"
          ? t("editor.tagPicker.aiRetry")
          : t("editor.tagPicker.aiGenerateDirect");
  const aiDescription = aiStatus.kind === "error" ? aiStatus.message : aiLabel;

  return (
    <>
      <div className="flex min-w-0 max-w-full items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          className="flex h-7 min-w-0 max-w-[32rem] items-center gap-1 rounded-md border border-transparent px-1.5 text-left text-xs text-slate-500 outline-none transition hover:border-slate-200 hover:bg-slate-50 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400/25 disabled:opacity-50 sm:gap-1.5 sm:px-2"
          aria-label={t("editor.tagPicker.open")}
          onClick={() => setOpen(true)}
        >
          {selectedTags.length > 0 ? (
            <span className="flex min-w-0 items-center gap-1 overflow-hidden">
              {selectedTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 whitespace-nowrap rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                >
                  #{tag}
                </span>
              ))}
              {selectedTags.length > 3 && (
                <span className="text-xs font-medium text-slate-400">+{selectedTags.length - 3}</span>
              )}
            </span>
          ) : (
            <span className="min-w-0 truncate text-slate-500">{t("editor.tagPlaceholder")}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        <TooltipProvider delayDuration={0} skipDelayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={disabled || suggesting || selectedTags.length >= 24 || (!title.trim() && !contentMarkdown.trim())}
                className={aiStatus.kind === "error"
                  ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-rose-700 outline-none transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:opacity-50"
                  : aiStatus.kind === "success"
                    ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400/30 disabled:opacity-50"
                    : "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-400/30 disabled:opacity-50"}
                aria-label={aiDescription}
                onClick={() => void generateAndApplyTags()}
              >
                {suggesting
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : aiStatus.kind === "success"
                    ? <Check className="h-3.5 w-3.5" />
                    : aiStatus.kind === "error"
                    ? <CircleAlert className="h-3.5 w-3.5" />
                    : <TagPlus className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{aiDescription}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="sr-only" aria-live="polite">{suggesting || aiStatus.kind !== "idle" ? aiDescription : ""}</span>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] max-w-lg overflow-hidden">
          <DialogHeader className="flex-row items-start gap-3 pr-14">
            <Tags aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            <div className="min-w-0 space-y-1.5">
              <DialogTitle>{t("editor.tagPicker.title")}</DialogTitle>
              <DialogDescription>{t("editor.tagPicker.description")}</DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label={t("editor.tagPicker.selected")}>
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="m3-state inline-flex h-8 items-center gap-1.5 rounded-full bg-emerald-100 px-3 text-label-medium font-medium text-emerald-800 outline-none hover:bg-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
                    onClick={() => toggleTag(tag)}
                    aria-label={t("editor.tagPicker.remove", { name: tag })}
                  >
                    #{tag}
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}

            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); createTag(); }}>
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("editor.tagPicker.searchPlaceholder")}
                aria-label={t("editor.tagPicker.searchPlaceholder")}
                className="h-11 min-w-0 flex-1 rounded-xl border-transparent bg-surface-container text-body-medium"
              />
              <Button type="submit" variant="solid" size="lg" className="shrink-0" disabled={!normalizedQuery || exactMatch || selectedTags.length >= 24}>
                {t("editor.tagPicker.create")}
              </Button>
            </form>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-surface-container p-1.5">
              {tagsQuery.isLoading ? (
                <p className="px-4 py-10 text-center text-body-medium text-slate-500">{t("editor.tagPicker.loading")}</p>
              ) : visibleTags.length === 0 ? (
                <DialogEmptyState title={t("editor.tagPicker.empty")} />
              ) : (
                visibleTags.map((tag) => {
                  const selected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      className={cn(
                        "m3-state flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-body-medium text-on-surface outline-none",
                        selected
                          ? "bg-emerald-100 font-medium text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100"
                          : "hover:bg-slate-200/70 focus-visible:bg-slate-200/70"
                      )}
                      onClick={() => toggleTag(tag.name)}
                      aria-pressed={selected}
                    >
                      <span className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        selected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-slate-300 bg-card text-transparent dark:border-slate-600 dark:bg-slate-900"
                      )}>
                        {selected && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">#{tag.name}</span>
                      <span className="text-body-small text-on-surface-variant">{t("editor.tagPicker.memoCount", { count: tag.memoCount })}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
