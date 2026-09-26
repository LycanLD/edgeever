import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock3, History, RotateCcw, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { getMemoTitle } from "@/lib/app-helpers";
import { AppConfirmDialog } from "./ConfirmDialogs";
import { buildRevisionDiffRows, type MemoDetail } from "@edgeever/shared";
import type { EdgeEverRepository } from "@/lib/repository";

const formatRevisionActor = (actor: string) => {
  if (actor.startsWith("user:")) {
    return "user";
  }

  if (actor.startsWith("agent:")) {
    return "agent";
  }

  return actor || "system";
};

export const RevisionHistoryDialog = ({
  memo,
  repository,
  currentMarkdown,
  onClose,
  onRestored,
}: {
  memo: MemoDetail;
  repository: EdgeEverRepository;
  currentMarkdown: string;
  onClose: () => void;
  onRestored: (memo: MemoDetail) => Promise<void>;
}) => {
  const { t } = useTranslation();
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [restoreRevisionConfirmationId, setRestoreRevisionConfirmationId] = useState<string | null>(null);

  const revisionsQuery = useQuery({
    queryKey: ["memo-revisions", memo.id],
    queryFn: () => repository.listMemoRevisions(memo.id),
  });

  const revisions = revisionsQuery.data?.revisions ?? [];
  const selectedRevision =
    revisions.find((revision) => revision.id === selectedRevisionId) ?? revisions[0] ?? null;

  const diffRows = useMemo(
    () => buildRevisionDiffRows(selectedRevision?.contentMarkdown ?? "", currentMarkdown),
    [currentMarkdown, selectedRevision?.contentMarkdown]
  );

  const diffSummary = useMemo(() => {
    let changed = 0;
    const len = diffRows.leftRows.length;
    for (let index = 0; index < len; index += 1) {
      const left = diffRows.leftRows[index];
      const right = diffRows.rightRows[index];
      if (left.state !== "same" || right.state !== "same") {
        changed += 1;
      }
    }
    return { changed };
  }, [diffRows]);

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) => repository.restoreMemoRevision(memo.id, revisionId),
    onSuccess: async (data) => {
      setRestoreRevisionConfirmationId(null);
      await onRestored(data.memo);
    },
  });

  useEffect(() => {
    if (!selectedRevisionId && revisions.length > 0) {
      setSelectedRevisionId(revisions[0].id);
    }
  }, [revisions, selectedRevisionId]);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !restoreRevisionConfirmationId) onClose(); }}>
      <DialogContent className="max-h-[88dvh] max-w-[1120px] overflow-hidden">
        <DialogHeader className="flex-row items-start gap-3 pr-14">
          <History aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          <div className="min-w-0 space-y-1.5">
            <DialogTitle>{t("revisions.title")}</DialogTitle>
            <DialogDescription className="truncate">{getMemoTitle(memo.title)}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex flex-wrap items-center gap-2">
              <div className="text-title-medium text-on-surface">
                {selectedRevision ? t("revisions.compareTitle", { revision: selectedRevision.revision }) : t("revisions.noRevisionSelected")}
              </div>
              {selectedRevision && (
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-label-small font-medium transition-colors",
                  diffSummary.changed > 0
                    ? "border-amber-200/60 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                    : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}>
                  {t("revisions.changedLines", { count: diffSummary.changed })}
                </span>
              )}
            </div>
            <Button
              size="lg"
              variant="solid"
              disabled={!selectedRevision || memo.isDeleted || restoreMutation.isPending}
              onClick={() => {
                if (selectedRevision) {
                  setRestoreRevisionConfirmationId(selectedRevision.id);
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t("revisions.restoreVersion")}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-outline-variant lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-1">
            <aside className="min-h-0 max-h-[220px] overflow-y-auto bg-surface-container p-3 lg:max-h-none lg:border-r lg:border-outline-variant">
              <div className="mb-2 px-2 text-label-large font-medium text-on-surface-variant">
                {t("revisions.timeline")}
              </div>
              {revisionsQuery.isLoading ? (
                <div className="px-2 py-8 text-center text-body-medium text-slate-500">{t("revisions.loading")}</div>
              ) : revisions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-outline-variant px-4 py-8 text-center text-body-medium text-on-surface-variant">
                  {t("revisions.empty")}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {revisions.map((revision) => (
                    <button
                      key={revision.id}
                      className={cn(
                        "m3-state group flex w-full flex-col rounded-xl p-3 text-left transition-colors",
                        selectedRevision?.id === revision.id
                          ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100"
                          : "bg-transparent hover:bg-slate-200/60"
                      )}
                      onClick={() => setSelectedRevisionId(revision.id)}
                    >
                      <span className={cn(
                        "block text-title-small transition-colors",
                        selectedRevision?.id === revision.id ? "font-semibold" : "font-medium text-on-surface"
                      )}>
                        {t("revisions.revisionName", { revision: revision.revision })}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5 truncate text-body-small text-on-surface-variant">
                        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{formatDateTime(revision.createdAt)}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 truncate text-body-small text-on-surface-variant opacity-80">
                        <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{revision.createdBy === "table-form" ? t("revisions.formActor") : formatRevisionActor(revision.createdBy)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <div className="flex min-h-0 flex-col">
              {/* Sticky Header Row */}
              <div className="sticky top-0 z-10 grid shrink-0 grid-cols-2 divide-x divide-outline-variant border-b border-outline-variant bg-surface-container">
                <div className="flex h-11 items-center justify-between bg-surface-container px-4">
                  <div className="text-label-large font-medium text-on-surface-variant">{t("revisions.historyVersion")}</div>
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                </div>
                <div className="flex h-11 items-center justify-between bg-surface-container px-4">
                  <div className="text-label-large font-medium text-on-surface-variant">{t("revisions.currentContent")}</div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Unified Scroll Container */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {diffRows.leftRows.length > 0 ? (
                  <div className="divide-y divide-slate-100/50">
                    {diffRows.leftRows.map((leftRow, idx) => {
                      const rightRow = diffRows.rightRows[idx];
                      return (
                        <div key={idx} className="grid grid-cols-2 divide-x divide-slate-200/80">
                          {/* Left Cell (History) */}
                          <div
                            className={cn(
                              "grid grid-cols-[3rem_minmax(0,1fr)] px-0 font-mono text-sm leading-6 transition-colors",
                              leftRow.state === "changed" && "bg-rose-50/45 text-rose-950 border-l-2 border-rose-400/85",
                              leftRow.state === "empty" && "bg-slate-50/30 text-transparent select-none border-l-2 border-transparent",
                              leftRow.state === "same" && "text-slate-700 border-l-2 border-transparent hover:bg-slate-50/30"
                            )}
                          >
                            <span className="select-none border-r border-slate-200/60 bg-slate-50/50 px-3 text-right text-xs text-slate-400">
                              {leftRow.lineNumber || ""}
                            </span>
                            <span className={cn("whitespace-pre-wrap break-words px-3 py-0.5", leftRow.state === "empty" && "select-none")}>
                              {leftRow.text || (leftRow.state === "empty" ? "" : " ")}
                            </span>
                          </div>

                          {/* Right Cell (Current) */}
                          <div
                            className={cn(
                              "grid grid-cols-[3rem_minmax(0,1fr)] px-0 font-mono text-sm leading-6 transition-colors",
                              rightRow.state === "changed" && "bg-emerald-50/45 text-emerald-950 border-l-2 border-emerald-400/85",
                              rightRow.state === "empty" && "bg-slate-50/30 text-transparent select-none border-l-2 border-transparent",
                              rightRow.state === "same" && "text-slate-700 border-l-2 border-transparent hover:bg-slate-50/30"
                            )}
                          >
                            <span className="select-none border-r border-slate-200/60 bg-slate-50/50 px-3 text-right text-xs text-slate-400">
                              {rightRow.lineNumber || ""}
                            </span>
                            <span className={cn("whitespace-pre-wrap break-words px-3 py-0.5", rightRow.state === "empty" && "select-none")}>
                              {rightRow.text || (rightRow.state === "empty" ? "" : " ")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-body-medium text-slate-400">
                    {t("revisions.emptyMemo")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {restoreRevisionConfirmationId && (
        <AppConfirmDialog
          title={t("revisions.restoreConfirmTitle")}
          description={t("revisions.restoreConfirmDescription")}
          confirmLabel={t("revisions.restoreConfirmLabel")}
          isWorking={restoreMutation.isPending}
          tone="primary"
          onCancel={() => setRestoreRevisionConfirmationId(null)}
          onConfirm={() => restoreMutation.mutate(restoreRevisionConfirmationId)}
        />
      )}
    </Dialog>
  );
};
