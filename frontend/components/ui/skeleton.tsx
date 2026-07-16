import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClass =
    variant === "circle"
      ? "rounded-full"
      : variant === "text"
        ? "h-4 rounded-md"
        : "rounded-xl";

  return (
    <div
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
