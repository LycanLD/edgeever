import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:ease-standard data-[state=closed]:ease-standard",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    unstyledPosition?: boolean;
  }
>(({ className, children, showCloseButton = true, unstyledPosition = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex w-full max-w-lg flex-col gap-4 rounded-[28px] bg-card p-6 text-card-foreground shadow-elev-3",
        !unstyledPosition && "left-[50%] top-[50%] max-h-[calc(100dvh-3rem)] translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2 data-[state=open]:ease-decelerate data-[state=closed]:ease-accelerate",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close className="m3-state absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 dark:hover:bg-slate-800 dark:hover:text-slate-50">
          <X className="h-[18px] w-[18px]" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-2 text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * MD3 headline-small for the dialog's primary label. Titles used to be
 * `text-sm`, which read as a caption rather than a headline next to the M3
 * body copy.
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-headline-small font-normal tracking-normal text-on-surface",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body-medium text-on-surface-variant", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/** Scrollable middle region so tall dialogs keep their header and actions pinned. */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)} {...props} />
);
DialogBody.displayName = "DialogBody";

/**
 * Grouped content block. M3 groups related settings inside a filled container
 * instead of outlining each row, which is what the dialogs did by hand before.
 */
const DialogSection = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("rounded-2xl bg-surface-container p-4", className)}
    {...props}
  />
);
DialogSection.displayName = "DialogSection";

const DialogSectionLabel = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      "text-label-large font-medium text-on-surface-variant",
      className
    )}
    {...props}
  />
);
DialogSectionLabel.displayName = "DialogSectionLabel";

/** Centred placeholder for empty lists and unselected detail panes. */
const DialogEmptyState = ({
  className,
  icon,
  title,
  description,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-10 text-center",
      className
    )}
    {...props}
  >
    {icon ? <div className="mb-1 text-outline-variant">{icon}</div> : null}
    <p className="text-title-small text-on-surface">{title}</p>
    {description ? (
      <p className="max-w-[38ch] text-body-small text-on-surface-variant">{description}</p>
    ) : null}
  </div>
);
DialogEmptyState.displayName = "DialogEmptyState";

/** Action row: destructive actions stay left, confirming actions stay right. */
const DialogActions = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end",
      className
    )}
    {...props}
  />
);
DialogActions.displayName = "DialogActions";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogSection,
  DialogSectionLabel,
  DialogEmptyState,
  DialogActions,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
