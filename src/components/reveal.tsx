import { cn } from "@/lib/format";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <div
      className={cn("vk-reveal", className)}
      style={delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
