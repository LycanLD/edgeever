import { Check, Copy, Download, LoaderCircle, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyImageBlobToClipboard } from "@/lib/clipboard";
import {
  createNoteImage,
  downloadPreparedNoteImage,
  type DownloadNoteImageOptions,
  type NoteImageCardWidth,
  type NoteImageFontSize,
  type NoteImageFontStyle,
  type NoteImageFormat,
  type NoteImageTheme,
  type PreparedNoteImage,
} from "@/lib/note-image-export";
import { getHtmlImageEmbedNoticeKind } from "@/lib/note-html-export";
import { cn } from "@/lib/utils";

export type ShareNoteImageSource = Omit<DownloadNoteImageOptions, "background" | "format">;

const THEME_OPTIONS: Array<{
  id: NoteImageTheme;
  previewBg: string;
  dotColor: string;
  isDark?: boolean;
}> = [
  { id: "slate", previewBg: "linear-gradient(135deg, #f8fafc, #e2e8f0)", dotColor: "#0284c7" },
  { id: "aurora", previewBg: "linear-gradient(135deg, #a7f3d0, #67e8f9, #c4b5fd)", dotColor: "#0d9488" },
  { id: "sunset", previewBg: "linear-gradient(135deg, #fde68a, #fbcfe8, #fed7aa)", dotColor: "#ea580c" },
  { id: "midnight", previewBg: "linear-gradient(135deg, #090d16, #1e1b4b)", dotColor: "#38bdf8", isDark: true },
  { id: "mint", previewBg: "linear-gradient(135deg, #ecfdf5, #a7f3d0)", dotColor: "#059669" },
  { id: "lavender", previewBg: "linear-gradient(135deg, #f5f3ff, #ddd6fe, #c4b5fd)", dotColor: "#7c3aed" },
  { id: "notepad", previewBg: "linear-gradient(135deg, #fbf7ee, #f4ede0)", dotColor: "#c2410c" },
  { id: "xuan", previewBg: "linear-gradient(135deg, #f7f6f2, #ebe8e1)", dotColor: "#b91c1c" },
];

const FONT_OPTIONS: Array<{ id: NoteImageFontStyle; labelKey: string }> = [
  { id: "sans", labelKey: "editor.imageShare.fontStyles.sans" },
  { id: "serif", labelKey: "editor.imageShare.fontStyles.serif" },
  { id: "mono", labelKey: "editor.imageShare.fontStyles.mono" },
];

const SIZE_OPTIONS: Array<{ id: NoteImageFontSize; labelKey: string }> = [
  { id: "sm", labelKey: "editor.imageShare.fontSizes.sm" },
  { id: "md", labelKey: "editor.imageShare.fontSizes.md" },
  { id: "lg", labelKey: "editor.imageShare.fontSizes.lg" },
];

const WIDTH_OPTIONS: Array<{ id: NoteImageCardWidth; labelKey: string }> = [
  { id: "compact", labelKey: "editor.imageShare.cardWidths.compact" },
  { id: "standard", labelKey: "editor.imageShare.cardWidths.standard" },
  { id: "wide", labelKey: "editor.imageShare.cardWidths.wide" },
];

export const ShareNoteImageDialog = ({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ShareNoteImageSource;
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<NoteImageFormat>("png");
  const [theme, setTheme] = useState<NoteImageTheme>("slate");
  const [fontStyle, setFontStyle] = useState<NoteImageFontStyle>("serif");
  const [fontSize, setFontSize] = useState<NoteImageFontSize>("lg");
  const [cardWidth, setCardWidth] = useState<NoteImageCardWidth>("standard");
  const [showTitle, setShowTitle] = useState(true);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showUpdatedAt, setShowUpdatedAt] = useState(true);
  const [showBranding, setShowBranding] = useState(true);
  const [prepared, setPrepared] = useState<PreparedNoteImage | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const generationRef = useRef(0);
  const copyAttemptRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setFormat("png");
    setTheme("slate");
    setFontStyle("serif");
    setFontSize("lg");
    setCardWidth("standard");
    setShowTitle(true);
    setShowNotebook(false);
    setShowTags(false);
    setShowUpdatedAt(true);
    setShowBranding(true);
    setCopyState("idle");
  }, [open, source.title]);

  useEffect(() => {
    if (!open) return;
    const generation = ++generationRef.current;
    copyAttemptRef.current += 1;
    setCopyState("idle");
    setPrepared(null);
    setError(false);
    const timer = window.setTimeout(() => {
      void createNoteImage({
        ...source,
        theme,
        background: theme,
        fontStyle,
        fontSize,
        cardWidth,
        showTitle,
        showNotebook,
        showTags,
        showUpdatedAt,
        branding: showBranding,
        format,
        notebook: showNotebook ? source.notebook : "",
        tags: showTags ? source.tags : [],
        updatedAt: showUpdatedAt ? source.updatedAt : "",
      })
        .then((result) => {
          if (generation !== generationRef.current) return;
          setPreviewUrl((current) => {
            if (current) URL.revokeObjectURL(current);
            return URL.createObjectURL(result.blob);
          });
          setPrepared(result);
        })
        .catch(() => {
          if (generation === generationRef.current) setError(true);
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    cardWidth,
    fontSize,
    fontStyle,
    format,
    open,
    showBranding,
    showNotebook,
    showTags,
    showTitle,
    showUpdatedAt,
    source,
    theme,
  ]);

  useEffect(() => () => {
    generationRef.current += 1;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const shareFile = useMemo(
    () => (prepared ? new File([prepared.blob], prepared.filename, { type: prepared.mimeType }) : null),
    [prepared],
  );
  const canUseSystemShare = Boolean(
    shareFile && navigator.canShare?.({ files: [shareFile] }) && navigator.share,
  );
  const noticeKind = prepared ? getHtmlImageEmbedNoticeKind(prepared.images) : "none";

  const handleCopyImage = async () => {
    if (!prepared || copyState === "copying") return;
    const attempt = ++copyAttemptRef.current;
    setCopyState("copying");
    const success = await copyImageBlobToClipboard(prepared.blob);
    if (attempt !== copyAttemptRef.current) return;
    if (!success) {
      setCopyState("failed");
      return;
    }
    setCopyState("copied");
    window.setTimeout(() => {
      if (attempt !== copyAttemptRef.current) return;
      setCopyState((current) => (current === "copied" ? "idle" : current));
    }, 2000);
  };

  const share = async () => {
    if (!prepared || !shareFile) return;
    try {
      await navigator.share({ files: [shareFile], title: source.title });
      onOpenChange(false);
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setError(true);
    }
  };

  const download = () => {
    if (!prepared) return;
    downloadPreparedNoteImage(prepared);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-hidden">
        <DialogHeader className="flex-row items-center gap-3 pr-14">
          <Share2 aria-hidden="true" className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
          <DialogTitle className="min-w-0">
            {t("editor.imageShare.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">{t("editor.imageShare.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-h-72 items-center justify-center overflow-auto rounded-2xl bg-surface-container p-4 sm:p-6 md:max-h-[68vh]">
            {previewUrl && prepared ? (
              <img
                alt={t("editor.imageShare.previewAlt")}
                className="mx-auto block h-auto max-w-full rounded-xl shadow-xl transition-all duration-200"
                style={{ maxHeight: "calc(72vh - 3rem)" }}
                src={previewUrl}
              />
            ) : error ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-rose-600" role="alert">
                {t("editor.imageExport.error")}
              </div>
            ) : (
              <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" />
                {t("editor.imageShare.generating")}
              </div>
            )}
          </div>

          <div className="space-y-6 overflow-y-auto md:max-h-[68vh]">
            {/* Theme Selector */}
            <fieldset className="space-y-2.5">
              <legend className="text-label-large font-medium text-on-surface-variant">
                {t("editor.imageShare.theme")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((item) => {
                  const isSelected = theme === item.id;
                  const label = t(`editor.imageShare.themes.${item.id}`);
                  return (
                    <button
                      key={item.id}
                      aria-pressed={isSelected}
                      className={cn(
                        "m3-state group relative flex items-center gap-2.5 rounded-2xl p-2.5 text-left text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70",
                        isSelected
                          ? "bg-emerald-100 font-medium text-emerald-950 ring-1 ring-emerald-400"
                          : "bg-surface-container text-on-surface",
                      )}
                      type="button"
                      onClick={() => setTheme(item.id)}
                    >
                      <span
                        className="h-6 w-6 shrink-0 rounded-lg border border-black/10 shadow-sm"
                        style={{ background: item.previewBg }}
                      />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Typography and Layout */}
            <fieldset className="space-y-3">
              <legend className="text-label-large font-medium text-on-surface-variant">
                {t("editor.imageShare.fontStyle")}
              </legend>
              <div className="flex rounded-full border border-outline-variant p-0.5">
                {FONT_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={fontStyle === item.id}
                    className={cn(
                      "m3-state h-9 flex-1 rounded-full px-2 text-label-large font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70",
                      fontStyle === item.id
                        ? "bg-emerald-100 text-emerald-950"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                    type="button"
                    onClick={() => setFontStyle(item.id)}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>

              {/* Font Size */}
              <div className="space-y-1.5 pt-1">
                <div className="text-label-large font-medium text-on-surface-variant">{t("editor.imageShare.fontSize")}</div>
                <div className="flex rounded-full border border-outline-variant p-0.5">
                  {SIZE_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={fontSize === item.id}
                      className={cn(
                        "m3-state h-9 flex-1 rounded-full px-2 text-label-large font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70",
                        fontSize === item.id
                          ? "bg-emerald-100 text-emerald-950"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                      type="button"
                      onClick={() => setFontSize(item.id)}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Width */}
              <div className="space-y-1.5 pt-1">
                <div className="text-label-large font-medium text-on-surface-variant">{t("editor.imageShare.cardWidth")}</div>
                <div className="flex rounded-full border border-outline-variant p-0.5">
                  {WIDTH_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      aria-pressed={cardWidth === item.id}
                      className={cn(
                        "m3-state h-9 flex-1 rounded-full px-2 text-label-large font-medium outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70",
                        cardWidth === item.id
                          ? "bg-emerald-100 text-emerald-950"
                          : "text-on-surface-variant hover:text-on-surface",
                      )}
                      type="button"
                      onClick={() => setCardWidth(item.id)}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            {/* Metadata / Content Toggles */}
            <fieldset className="space-y-2.5">
              <legend className="text-label-large font-medium text-on-surface-variant">
                {t("editor.imageShare.metadata")}
              </legend>
              <div className="space-y-2">
                {([
                  ["title", showTitle, setShowTitle],
                  ["notebook", showNotebook, setShowNotebook],
                  ["tags", showTags, setShowTags],
                  ["updatedAt", showUpdatedAt, setShowUpdatedAt],
                  ["branding", showBranding, setShowBranding],
                ] as const).map(([key, checked, setChecked]) => (
                  <label key={key} className="m3-state flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2 text-body-medium text-on-surface">
                    <Checkbox checked={checked} onCheckedChange={(value) => setChecked(value === true)} />
                    {t(`editor.imageShare.fields.${key}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Format Selection */}
            <label className="grid gap-1.5 text-label-large font-medium text-on-surface-variant">
              {t("editor.imageShare.format")}
              <Select value={format} onValueChange={(value) => setFormat(value as NoteImageFormat)}>
                <SelectTrigger className="h-11 w-full rounded-xl text-body-medium font-normal normal-case tracking-normal text-slate-700 dark:text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem className="text-body-medium" value="png">
                    PNG · {t("editor.imageShare.pngHint")}
                  </SelectItem>
                  <SelectItem className="text-body-medium" value="jpeg">
                    JPEG · {t("editor.imageShare.jpegHint")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>

            {noticeKind !== "none" ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-body-small leading-5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
                {t(
                  noticeKind === "partial"
                    ? "editor.imageExport.imageEmbedPartial"
                    : "editor.imageExport.imageEmbedFailed",
                  prepared?.images,
                )}
              </p>
            ) : null}
            {prepared && prepared.height > 12_000 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-body-small leading-5 text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">{t("editor.imageShare.longImageWarning")}</p>
            ) : null}
          </div>
        </div>

        {copyState === "failed" ? (
          <p className="rounded-xl bg-rose-50 px-4 py-2 text-body-small text-rose-700 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
            {t("editor.imageShare.copyFailed")}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="soft"
            size="lg"
            disabled={!prepared || copyState === "copying"}
            onClick={() => void handleCopyImage()}
          >
            {copyState === "copied" ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-700">{t("editor.imageShare.copied")}</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t("editor.imageShare.copyImage")}
              </>
            )}
          </Button>
          <Button
            variant={canUseSystemShare ? "outline" : "solid"}
            size="lg"
            disabled={!prepared}
            onClick={download}
          >
            <Download className="h-4 w-4" />
            {t("editor.imageShare.download")}
          </Button>
          {canUseSystemShare ? (
            <Button variant="solid" size="lg" disabled={!prepared} onClick={() => void share()}>
              <Share2 className="h-4 w-4" />
              {t("editor.imageShare.share")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

