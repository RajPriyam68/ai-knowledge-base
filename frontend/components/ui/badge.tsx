import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary text-secondary-foreground border-border",
    success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
    warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    outline: "border-border text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "PROCESSED":
      return "success";
    case "PROCESSING":
    case "PENDING":
      return "warning";
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function roleBadgeVariant(role: string): BadgeVariant {
  return role === "ADMIN" ? "default" : "secondary";
}
