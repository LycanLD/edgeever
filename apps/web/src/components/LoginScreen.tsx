import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeInstanceUrl } from "@edgeever/shared";
import { Button } from "@/components/ui/button";
import { GitHubRepositoryLink } from "@/components/GitHubRepositoryLink";
import { Input } from "@/components/ui/input";
import { getAppAssetPath } from "@/lib/app-page-path";

interface LoginScreenProps {
  error: { message: string; diagnosticCode: string; rayId?: string } | null;
  instanceUrl?: string;
  isSubmitting: boolean;
  onSubmit: (payload: { instanceUrl?: string; username: string; password: string }) => void;
}

const DEMO_LOGIN_CREDENTIALS = {
  username: "ee-demo",
  password: "demo#dZ6Q29Zjfor%",
};

const getDefaultLoginCredentials = () => {
  const hostname = window.location.hostname;
  const isDemoHost = hostname === "demo.edgeever.org" || hostname.startsWith("edgeever-demo.");

  return isDemoHost ? DEMO_LOGIN_CREDENTIALS : { username: "", password: "" };
};

/**
 * The mascot video is dark line art on an opaque white field. Inverting it turns
 * the lines white and the field black, then screen-blending drops the black
 * field so only the white mascot remains over a brand-glow anchored in the
 * bottom-right corner. The glow gives the white lines something to read against
 * in both colour schemes.
 */
const LoginMascot = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (prefersReducedMotion) {
      video.pause();
      return;
    }
    void video.play().catch(() => undefined);
  }, [prefersReducedMotion]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute bottom-[-20%] right-[-12%] h-[min(780px,155vw)] w-[min(780px,155vw)] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgb(var(--brand-green-600-rgb)/0.5),rgb(var(--brand-green-400-rgb)/0.26)_46%,transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgb(var(--brand-green-600-rgb)/0.38),rgb(var(--brand-green-500-rgb)/0.18)_46%,transparent_70%)]" />
      <video
        ref={videoRef}
        autoPlay={!prefersReducedMotion}
        className="absolute bottom-0 right-0 h-[min(540px,82vw)] w-[min(540px,82vw)] translate-x-[4%] translate-y-[6%] object-contain invert mix-blend-screen drop-shadow-xl"
        loop
        muted
        playsInline
        poster={getAppAssetPath("login/boykisser-dance-poster.jpg", import.meta.env.BASE_URL)}
        preload="metadata"
      >
        <source
          src={getAppAssetPath("login/boykisser-dance.webm", import.meta.env.BASE_URL)}
          type="video/webm"
        />
        <source
          src={getAppAssetPath("login/boykisser-dance.mp4", import.meta.env.BASE_URL)}
          type="video/mp4"
        />
      </video>
    </div>
  );
};

const loginFieldClassName =
  "h-13 rounded-xl border border-outline-variant bg-surface px-4 text-[15px] text-on-surface transition placeholder:text-on-surface-variant/70 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/15";

export const LoginScreen = ({ error, instanceUrl: initialInstanceUrl, isSubmitting, onSubmit }: LoginScreenProps) => {
  const { t } = useTranslation();
  const [instanceUrl, setInstanceUrl] = useState(initialInstanceUrl ?? "");
  const [username, setUsername] = useState(() => getDefaultLoginCredentials().username);
  const [password, setPassword] = useState(() => getDefaultLoginCredentials().password);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if ((initialInstanceUrl !== undefined && !instanceUrl.trim()) || !username.trim() || !password) {
      return;
    }

    onSubmit({
      ...(initialInstanceUrl !== undefined ? { instanceUrl: normalizeInstanceUrl(instanceUrl) } : {}),
      username: username.trim(),
      password,
    });
  };

  return (
    <main className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-[var(--workspace-canvas)] px-4 py-10 text-on-surface">
      <LoginMascot />
      <GitHubRepositoryLink className="m3-state absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface/85 text-on-surface-variant backdrop-blur transition hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60" iconClassName="h-5 w-5" />

      <section className="relative w-full max-w-[420px] rounded-3xl bg-surface-container p-7 shadow-elev-3 sm:p-8">
        <div className="flex flex-col items-center gap-4 pb-7 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
            <img
              alt=""
              aria-hidden="true"
              className="h-11 w-11"
              src={getAppAssetPath("favicon.svg", import.meta.env.BASE_URL)}
            />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-headline-small font-normal leading-tight text-on-surface">
              {t("login.title")}
            </h1>
            <p className="text-body-medium text-on-surface-variant">{t("login.subtitle")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? (
            <div
              className="animate-shake rounded-2xl border border-rose-200 bg-rose-50/85 px-4 py-3 text-rose-900 transition duration-150 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              role="alert"
            >
              <p className="text-sm font-medium leading-6">{error.message}</p>
              <p className="mt-1 font-mono text-xs text-rose-500 dark:text-rose-300/80">
                {t("login.diagnosticCode", { code: error.diagnosticCode })}
              </p>
              {error.rayId ? (
                <p className="mt-0.5 break-all font-mono text-xs text-rose-500 dark:text-rose-300/80">
                  {t("login.cloudflareRayId", { id: error.rayId })}
                </p>
              ) : null}
            </div>
          ) : null}

          {initialInstanceUrl !== undefined ? (
            <label className="block">
              <span className="mb-1.5 block text-label-large font-medium text-on-surface-variant">
                {t("login.desktopInstanceUrl")}
              </span>
              <Input
                autoCapitalize="none"
                autoComplete="url"
                autoCorrect="off"
                className={loginFieldClassName}
                inputMode="url"
                placeholder={t("login.instanceUrlPlaceholder")}
                required
                spellCheck={false}
                value={instanceUrl}
                onChange={(event) => setInstanceUrl(event.target.value)}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-label-large font-medium text-on-surface-variant">
              {t("login.username")}
            </span>
            <Input
              autoComplete="username"
              className={loginFieldClassName}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-label-large font-medium text-on-surface-variant">
              {t("login.password")}
            </span>
            <Input
              autoComplete="current-password"
              className={loginFieldClassName}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <Button
            className="mt-2 h-12 w-full justify-center rounded-full text-[15px] font-semibold shadow-elev-2"
            size="md"
            type="submit"
            variant="solid"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="mr-1 h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <LockKeyhole aria-hidden="true" className="mr-1 h-4 w-4" strokeWidth={1.75} />
            )}
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </section>
    </main>
  );
};
