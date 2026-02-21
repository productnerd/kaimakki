type BadgeVariant =
  | "default"
  | "accent"
  | "lime"
  | "pink"
  | "warning"
  | "success";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-border text-cream-78",
  accent: "bg-accent/20 text-accent",
  lime: "bg-lime/20 text-lime",
  pink: "bg-pink/20 text-pink",
  warning: "bg-yellow-500/20 text-yellow-400",
  success: "bg-green-500/20 text-green-400",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5
        text-xs font-medium rounded-full
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
