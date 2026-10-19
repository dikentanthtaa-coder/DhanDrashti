import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * The DhanDrashti mark — the same artwork as the app icon / favicon
 * (public/icons/icon.svg) so the brand looks identical everywhere.
 */
export function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icons/icon.svg"
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-[22%] shadow-sm", className)}
      aria-hidden="true"
    />
  );
}

/** Mark + wordmark, used in headers. */
export function BrandLockup({ size = 36, className, textClassName }: { size?: number; className?: string; textClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandLogo size={size} />
      <span className={cn("font-semibold tracking-tight", textClassName)}>{APP_NAME}</span>
    </span>
  );
}
