import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300",
  {
    variants: {
      variant: {
        default:
          "border-2 border-b-4 border-slate-200 bg-white text-slate-500 hover:bg-slate-100 active:border-b-2",
        primary:
          "border-b-4 border-sky-500 bg-sky-400 text-white hover:bg-sky-400/90 active:border-b-0",
        secondary:
          "border-b-4 border-green-500 bg-green-400 text-white hover:bg-green-400/90 active:border-b-0",
        warning:
          "border-b-4 border-yellow-500 bg-yellow-400 text-white hover:bg-yellow-400/90 active:border-b-0",
        danger:
          "border-b-4 border-rose-500 bg-rose-400 text-white hover:bg-rose-400/90 active:border-b-0",
        ghost:
          "border-0 border-transparent bg-transparent text-slate-500 hover:bg-slate-100",
        locked:
          "border-b-4 border-neutral-400 bg-neutral-200 text-neutral-500 hover:bg-neutral-200/90",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
