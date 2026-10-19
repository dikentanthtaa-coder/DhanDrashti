import {
  Banknote,
  Briefcase,
  Building2,
  Bus,
  CircleEllipsis,
  CirclePlus,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PawPrint,
  Percent,
  Plane,
  Receipt,
  RotateCcw,
  Scale,
  Shield,
  Shirt,
  ShoppingBasket,
  Store,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  Car,
  Coffee,
  Dumbbell,
  Film,
  Fuel,
  Music,
  Smartphone,
  Wifi,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Whitelisted icon names stored in categories.icon (lucide names). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-basket": ShoppingBasket,
  shirt: Shirt,
  bus: Bus,
  plane: Plane,
  "heart-pulse": HeartPulse,
  house: House,
  receipt: Receipt,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  users: Users,
  landmark: Landmark,
  "paw-print": PawPrint,
  briefcase: Briefcase,
  "hand-heart": HandHeart,
  shield: Shield,
  scale: Scale,
  "circle-ellipsis": CircleEllipsis,
  banknote: Banknote,
  laptop: Laptop,
  store: Store,
  "building-2": Building2,
  percent: Percent,
  "trending-up": TrendingUp,
  "rotate-ccw": RotateCcw,
  gift: Gift,
  "circle-plus": CirclePlus,
  car: Car,
  coffee: Coffee,
  dumbbell: Dumbbell,
  film: Film,
  fuel: Fuel,
  music: Music,
  smartphone: Smartphone,
  wifi: Wifi,
  wallet: Wallet,
  tag: Tag,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({
  icon,
  color,
  className,
  size = "md",
}: {
  icon: string | null | undefined;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Tag;
  const box = size === "sm" ? "size-6 rounded-md" : size === "lg" ? "size-10 rounded-xl" : "size-8 rounded-lg";
  const glyph = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", box, className)}
      style={{ backgroundColor: color ? `${color}22` : "var(--muted)", color: color ?? "var(--muted-foreground)" }}
      aria-hidden="true"
    >
      <Icon className={glyph} />
    </span>
  );
}
