import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@atelier/ui";

/**
 * Bouton.
 *
 * `asChild` permet de rendre un `<Link>` avec l'apparence d'un bouton sans
 * imbriquer `<a><button>`, ce qui casserait la sémantique et la navigation
 * clavier.
 *
 * L'anneau de focus est toujours visible sur `:focus-visible` : le supprimer
 * rend l'application inutilisable au clavier, et c'est la régression
 * d'accessibilité la plus fréquente.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-atelier)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]",
        secondary:
          "bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border-strong)] hover:bg-[var(--surface)]",
        ghost: "text-[var(--text)] hover:bg-[var(--surface)]",
        danger: "bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90",
        link: "text-[var(--accent)] underline underline-offset-4",
      },
      size: {
        // 44 px de haut minimum sur les tailles tactiles : cible recommandée
        // par WCAG 2.2 (2.5.8).
        sm: "h-9 px-3 text-xs",
        md: "h-11 px-5",
        lg: "h-12 px-7 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
