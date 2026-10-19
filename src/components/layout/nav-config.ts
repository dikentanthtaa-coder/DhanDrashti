import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  CalendarClock,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tags,
  Wallet,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean; // show in bottom bar
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, mobile: true },
  { href: "/reports", label: "Reports", icon: BarChart3, mobile: true },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/recurring", label: "Recurring", icon: CalendarClock },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
