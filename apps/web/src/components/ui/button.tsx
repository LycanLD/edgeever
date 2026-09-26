import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const ButtonTooltip = React.lazy(() =>
  import("./button-tooltip").then((module) => ({ default: module.ButtonTooltip }))
);

const buttonVariants = cva(
  "m3-state inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-emerald-500 text-white border-emerald-500",
        soft: "bg-emerald-100 text-emerald-700 border border-transparent",
        ghost: "bg-transparent text-slate-600 hover:text-slate-900 border-transparent",
        outline: "bg-transparent text-slate-700 border border-outline-variant",
        danger: "bg-rose-50 text-rose-700 border border-rose-100",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm: "h-8 gap-1.5 px-2.5 text-xs",
        md: "h-9 gap-2 px-3 text-sm",
        lg: "h-11 gap-2 px-5 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "soft",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, title, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );

    if (!title) {
      return button;
    }

    return (
      <React.Suspense fallback={button}>
        <ButtonTooltip title={title}>{button}</ButtonTooltip>
      </React.Suspense>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
