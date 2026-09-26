import { CircleUserRound, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAppAssetPath } from "@/lib/app-page-path";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export const WorkspaceTopBar = ({
  onSearch,
  onOpenSettings,
}: {
  onSearch: () => void;
  onOpenSettings: () => void;
}) => {
  const { t } = useTranslation();
  const searchLabel = t("memoList.searchPlaceholder");

  return (
    <header className="edgeever-top-app-bar z-30 shrink-0 border-b border-slate-200 bg-workspace-sidebar pt-[env(safe-area-inset-top)]">
      <div className="flex h-12 items-center gap-2 px-3 lg:h-14 lg:gap-3 lg:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <img src={getAppAssetPath("favicon.svg", import.meta.env.BASE_URL)} alt="" aria-hidden="true" className="h-6 w-6 lg:h-7 lg:w-7" />
          <span className="text-sm font-bold tracking-tight text-slate-950">LumiNotes</span>
        </div>

        <button
          type="button"
          onClick={onSearch}
          aria-label={searchLabel}
          className="m3-state ml-3 hidden h-9 w-64 shrink items-center gap-2 rounded-full border border-slate-200 bg-workspace-memo-list px-3 text-sm text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 md:flex"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate text-left">{searchLabel}</span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onSearch}
            aria-label={searchLabel}
            className="m3-state flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 md:hidden"
          >
            <Search className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <ThemeToggle className="flex h-9 w-9" />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label={t("notebookPane.profile")}
            className="m3-state flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <CircleUserRound className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default WorkspaceTopBar;
