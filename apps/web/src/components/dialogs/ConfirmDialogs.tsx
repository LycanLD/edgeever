import { useState, useEffect, useRef } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Notebook } from "@edgeever/shared";

// Types derived from App.tsx
export type MemoDeleteConfirmation = { kind: "single" | "bulk"; memoIds: string[]; permanent: boolean };
export type NotebookNameDialogState =
  | { mode: "create"; parentId: string | null }
  | { mode: "rename"; notebook: Notebook };

export const AppConfirmDialog = ({
  cancelLabel,
  confirmLabel,
  description,
  error,
  hideCancel = false,
  isWorking = false,
  title,
  tone = "danger",
  closeOnBrowserBack,
  onCancel,
  onConfirm,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  error?: string | null;
  hideCancel?: boolean;
  isWorking?: boolean;
  title: string;
  tone?: "danger" | "neutral" | "primary";
  closeOnBrowserBack?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();
  const toneClassName =
    tone === "danger"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
      : tone === "primary"
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        : "bg-surface-container text-on-surface-variant";
  const confirmVariant = tone === "danger" ? "danger" : "solid";
  const Icon = tone === "danger" ? AlertTriangle : ShieldCheck;

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isWorking) onCancel(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-[28px] bg-card p-0 shadow-elev-3">
        <DialogHeader className="flex flex-row items-start gap-4 px-6 pb-4 pt-6 text-left">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", toneClassName)}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1">
              {description}
            </DialogDescription>
            {error ? <p className="mt-2 text-body-small text-rose-600 dark:text-rose-400" role="alert">{error}</p> : null}
          </div>
        </DialogHeader>
        <DialogFooter className="px-6 pb-6 pt-2">
          {!hideCancel && (
            <Button className="justify-center" variant="outline" onClick={onCancel} disabled={isWorking}>
              {cancelLabel ?? t("common.cancel")}
            </Button>
          )}
          <Button className="justify-center" variant={confirmVariant} onClick={onConfirm} disabled={isWorking}>
            {isWorking ? t("common.processing") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const MemoDeleteConfirmDialog = ({
  confirmation,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  confirmation: MemoDeleteConfirmation;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();
  const count = confirmation.memoIds.length;
  const isBulk = confirmation.kind === "bulk" || count > 1;
  const title = confirmation.permanent
    ? isBulk
      ? t("dialogs.memoDelete.permanentBulkTitle", { count })
      : t("dialogs.memoDelete.permanentSingleTitle")
    : isBulk
      ? t("dialogs.memoDelete.softBulkTitle", { count })
      : t("dialogs.memoDelete.softSingleTitle");
  const description = confirmation.permanent ? t("dialogs.memoDelete.permanentDescription") : t("dialogs.memoDelete.softDescription");
  const confirmLabel = confirmation.permanent ? t("dialogs.memoDelete.permanentConfirm") : t("dialogs.memoDelete.softConfirm");

  return (
    <AppConfirmDialog
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      tone="danger"
      isWorking={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export const NotebookNameDialog = ({
  dialog,
  isSaving,
  onCancel,
  onSubmit,
}: {
  dialog: NotebookNameDialogState;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) => {
  const { t } = useTranslation();
  const initialName = dialog.mode === "rename" ? dialog.notebook.name : "";
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedName = name.trim();
  const unchanged = dialog.mode === "rename" && trimmedName === dialog.notebook.name;
  const title = dialog.mode === "create" ? t("dialogs.notebookName.createTitle") : t("dialogs.notebookName.renameTitle");
  const submitLabel = dialog.mode === "create" ? t("dialogs.notebookName.createSubmit") : t("common.save");

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  }, []);

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-[28px] bg-card p-0 shadow-elev-3">
        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedName || unchanged || isSaving) {
              return;
            }
            onSubmit(trimmedName);
          }}
        >
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {dialog.mode === "create" ? t("dialogs.notebookName.createDescription") : t("dialogs.notebookName.renameDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6">
            <label className="block text-label-large font-medium text-on-surface-variant" htmlFor="notebook-name-input">
              {t("dialogs.notebookName.nameLabel")}
            </label>
            <Input
              id="notebook-name-input"
              ref={inputRef}
              className="mt-2 h-11 text-base focus-visible:border-emerald-300 focus-visible:ring-emerald-500/20"
              value={name}
              disabled={isSaving}
              maxLength={80}
              placeholder={t("dialogs.notebookName.namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <DialogFooter className="mt-auto px-6 pb-6 pt-2">
            <Button className="justify-center" type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button className="justify-center" type="submit" variant="solid" disabled={!trimmedName || unchanged || isSaving}>
              {isSaving ? t("common.saving") : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
