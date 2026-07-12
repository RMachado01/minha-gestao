import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  TrendingUp,
  CreditCard,
  Car,
  CirclePlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navegação principal — as 6 telas do protótipo. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: ArrowLeftRight },
  { href: "/lancamentos", label: "Lançamentos", icon: CirclePlus },
  { href: "/gastos", label: "Composição de Gastos", icon: PieChart },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { href: "/cartoes", label: "Cartões", icon: CreditCard },
  { href: "/uber", label: "Uber", icon: Car },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
