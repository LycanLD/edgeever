import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Link2, LoaderCircle, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogSection,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, getConfiguredDesktopApiBaseUrl } from "@/lib/api";
import { copyTextToClipboard } from "@/lib/clipboard";

const getPublicShareUrl = (token: string) => {
  const baseUrl = getConfiguredDesktopApiBaseUrl() || window.location.origin;
  return `${baseUrl.replace(/\/$/, "")}/share/${encodeURIComponent(token)}`;
};

const sharePasswordStorageKey = (memoId: string) => `edgeever.sharePassword.${memoId}`;

const readStoredSharePassword = (memoId: string, token: string) => {
  try {
    const raw = window.sessionStorage.getItem(sharePasswordStorageKey(memoId));
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { token?: string; password?: string };
    return parsed.token === token && typeof parsed.password === "string" ? parsed.password : "";
  } catch {
    return "";
  }
};

const writeStoredSharePassword = (memoId: string, token: string, password: string) => {
  try {
    window.sessionStorage.setItem(sharePasswordStorageKey(memoId), JSON.stringify({ token, password }));
  } catch {
    // sessionStorage may be unavailable; the generated password is still shown in this dialog session.
  }
};

const clearStoredSharePassword = (memoId: string) => {
  try {
    window.sessionStorage.removeItem(sharePasswordStorageKey(memoId));
  } catch {
    // Ignore restricted storage contexts.
  }
};

export const memoShareQueryKey = (memoId: string) => ["memo-share", memoId] as const;

export const ShareMemoDialog = ({
  memoId,
  open,
  onOpenChange,
}: {
  memoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [copyTarget, setCopyTarget] = useState<"link" | "password" | "both">("link");
  const [revealedPassword, setRevealedPassword] = useState("");
  const copyResetTimerRef = useRef<number | null>(null);
  const queryKey = memoShareQueryKey(memoId);
  const shareQuery = useQuery({
    queryKey,
    queryFn: () => api.getMemoShare(memoId),
    enabled: open,
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: () => api.createMemoShare(memoId),
    onSuccess: (data) => queryClient.setQueryData(queryKey, data),
  });
  const passwordMutation = useMutation({
    mutationFn: (passwordProtected: boolean) => api.updateMemoShare(memoId, { passwordProtected }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, { share: { ...data.share, password: undefined } });
      if (data.share.password) {
        writeStoredSharePassword(memoId, data.share.token, data.share.password);
        setRevealedPassword(data.share.password);
      } else {
        clearStoredSharePassword(memoId);
        setRevealedPassword("");
      }
    },
  });
  const revokeMutation = useMutation({
    mutationFn: () => api.revokeMemoShare(memoId),
    onSuccess: () => {
      clearStoredSharePassword(memoId);
      setRevealedPassword("");
      queryClient.setQueryData(queryKey, { share: null });
    },
  });
  useEffect(() => {
    createMutation.reset();
    passwordMutation.reset();
    revokeMutation.reset();
    setCopyState("idle");
    setCopyTarget("link");
    setRevealedPassword("");
  }, [memoId]);
  useEffect(() => () => {
    if (copyResetTimerRef.current !== null) window.clearTimeout(copyResetTimerRef.current);
  }, []);

  const share = shareQuery.data?.share ?? null;
  useEffect(() => {
    if (!share?.passwordProtected) {
      setRevealedPassword("");
      return;
    }
    setRevealedPassword(readStoredSharePassword(memoId, share.token));
  }, [memoId, share?.passwordProtected, share?.token]);

  const shareUrl = share ? getPublicShareUrl(share.token) : "";
  const isWorking = shareQuery.isLoading || createMutation.isPending || passwordMutation.isPending || revokeMutation.isPending;
  const error = shareQuery.error || createMutation.error || passwordMutation.error || revokeMutation.error;

  const markCopied = (target: "link" | "password" | "both", copied: boolean) => {
    setCopyTarget(target);
    setCopyState(copied ? "copied" : "error");
    if (copyResetTimerRef.current !== null) window.clearTimeout(copyResetTimerRef.current);
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyState("idle");
      copyResetTimerRef.current = null;
    }, 3000);
  };

  const copyValue = async (target: "link" | "password" | "both", value: string) => {
    markCopied(target, await copyTextToClipboard(value));
  };

  const copiedLabel = (target: "link" | "password" | "both", idleKey: string) =>
    copyState === "copied" && copyTarget === target
      ? "sharing.copied"
      : copyState === "error" && copyTarget === target
        ? "sharing.copyFailed"
        : idleKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 pr-14">
          <Share2 aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          <div className="min-w-0 space-y-1.5">
            <DialogTitle>{t("sharing.title")}</DialogTitle>
            <DialogDescription>
              {t(share?.passwordProtected ? "sharing.descriptionProtected" : "sharing.description")}
            </DialogDescription>
          </div>
        </DialogHeader>

        {shareQuery.isLoading ? (
          <div className="flex min-h-24 flex-1 items-center justify-center text-on-surface-variant" role="status">
            <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
          </div>
        ) : share ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              <div className="grid gap-2">
                <label className="text-label-large font-medium text-on-surface-variant" htmlFor="ee-share-link">
                  {t("sharing.linkLabel")}
                </label>
                <div className="flex gap-2">
                  <Input
                    id="ee-share-link"
                    value={shareUrl}
                    readOnly
                    className="h-11 min-w-0 flex-1 rounded-xl border-transparent bg-surface-container font-mono text-xs"
                  />
                  <Button
                    variant={copyState === "copied" && copyTarget === "link" ? "solid" : copyState === "error" && copyTarget === "link" ? "danger" : "soft"}
                    size="lg"
                    className="min-w-24"
                    aria-live="polite"
                    onClick={() => void copyValue("link", shareUrl)}
                  >
                    {copyState === "copied" && copyTarget === "link" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                    {t(copiedLabel("link", "sharing.copy"))}
                  </Button>
                </div>
              </div>

              <DialogSection className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label-large font-medium text-on-surface-variant">{t("sharing.passwordToggle")}</span>
                  <Switch
                    checked={share.passwordProtected}
                    disabled={isWorking}
                    onCheckedChange={(enabled) => passwordMutation.mutate(enabled)}
                    aria-label={t("sharing.passwordToggle")}
                  />
                </div>
                {share.passwordProtected ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={revealedPassword}
                        readOnly
                        placeholder={t("sharing.passwordSet")}
                        aria-label={t("sharing.passwordLabel")}
                        className="h-11 min-w-0 flex-1 rounded-xl border-transparent bg-card font-mono text-xs tracking-wide"
                      />
                      <Button
                        variant={copyState === "copied" && copyTarget === "password" ? "solid" : copyState === "error" && copyTarget === "password" ? "danger" : "soft"}
                        size="lg"
                        className="min-w-24"
                        disabled={!revealedPassword}
                        aria-live="polite"
                        onClick={() => void copyValue("password", revealedPassword)}
                      >
                        {copyState === "copied" && copyTarget === "password" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                        {t(copiedLabel("password", "sharing.passwordCopy"))}
                      </Button>
                      <Button
                        variant="soft"
                        size="lg"
                        className="w-11 px-0"
                        disabled={isWorking}
                        title={t("sharing.regeneratePassword")}
                        aria-label={t("sharing.regeneratePassword")}
                        onClick={() => passwordMutation.mutate(true)}
                      >
                        {passwordMutation.isPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="h-4 w-4" />}
                      </Button>
                    </div>
                    {revealedPassword ? (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-1 text-xs text-on-surface-variant hover:text-on-surface"
                          onClick={() => void copyValue("both", `${shareUrl}\n${t("sharing.passwordPrefix")}${revealedPassword}`)}
                        >
                          {copyState === "copied" && copyTarget === "both" ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                          {t(copiedLabel("both", "sharing.copyLinkAndPassword"))}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </DialogSection>

              <p className="text-body-small leading-5 text-on-surface-variant">{t("sharing.liveContentHint")}</p>
              {error ? <p className="text-body-small text-rose-600 dark:text-rose-400" role="alert">{t("sharing.error")}</p> : null}
            </div>

            <DialogActions className="sm:justify-between">
              <Button variant="danger" size="lg" disabled={isWorking} onClick={() => revokeMutation.mutate()}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {t("sharing.revoke")}
              </Button>
              <Button variant="soft" size="lg" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
                {t("sharing.open")}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
              <p className="text-body-medium leading-6 text-on-surface-variant">{t("sharing.inactiveHint")}</p>
              {error ? <p className="text-body-small text-rose-600 dark:text-rose-400" role="alert">{t("sharing.error")}</p> : null}
            </div>
            <DialogActions className="sm:justify-end">
              <Button className="w-full sm:w-auto" variant="solid" size="lg" disabled={isWorking} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}
                {t("sharing.create")}
              </Button>
            </DialogActions>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
