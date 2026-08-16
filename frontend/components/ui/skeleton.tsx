import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "text"
        ? "h-4 rounded-squircle-sm"
        : "rounded-squircle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-skeleton",
        variantClass,
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
