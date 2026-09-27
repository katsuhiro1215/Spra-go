import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-black transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b6fa3] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-2 border-b-4 border-[#e8dfcf] bg-white text-[#3b3226] hover:bg-[#fffaf0] active:border-b-2",
        primary:
          "border-b-4 border-[#285a19] bg-[#3b7f26] text-white hover:bg-[#438b2d] active:border-b-0",
        secondary:
          "border-b-4 border-[#3b7f26] bg-[#5bb33e] text-[#3b3226] hover:bg-[#66bd49] active:border-b-0",
        warning:
          "border-b-4 border-[#c98f12] bg-[#f2b632] text-[#3b3226] hover:bg-[#f5c04d] active:border-b-0",
        danger:
          "border-b-4 border-[#c9573b] bg-[#f28b6d] text-[#3b3226] hover:bg-[#f49a7f] active:border-b-0",
        ghost:
          "border-0 border-transparent bg-transparent text-[#3b3226] hover:bg-[#f5efe1]",
        locked:
          "border-b-4 border-[#dccfb4] bg-[#efe5cf] text-[#8a7a5a] hover:bg-[#efe5cf]",
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
