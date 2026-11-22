import { cn } from "@/lib/format";

type SectionHeadingProps = {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
  inverted?: boolean;
};

export function SectionHeading({
  title,
  description,
  className,
  action,
  inverted = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-2xl">
        <h2
          className={cn(
            "text-[1.75rem] leading-tight sm:text-[2rem]",
            inverted ? "text-white" : "text-ink"
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-3 text-[15px] leading-relaxed",
              inverted ? "text-[#b6cbe3]" : "text-muted"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
