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
  group: "principal" | "financas" | "patrimonio" | "trabalho" | "conta";
}

/** Navegação principal — as 6 telas do protótipo. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard, group: "principal" },
  { href: "/lancamentos", label: "Lançamentos", icon: CirclePlus, group: "financas" },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: ArrowLeftRight, group: "financas" },
  { href: "/gastos", label: "Gastos", icon: PieChart, group: "financas" },
  { href: "/cartoes", label: "Cartões", icon: CreditCard, group: "financas" },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp, group: "patrimonio" },
  { href: "/uber", label: "Uber", icon: Car, group: "trabalho" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, group: "conta" },
];

export const NAV_GROUPS = [
  { id: "principal", label: "" },
  { id: "financas", label: "Finanças" },
  { id: "patrimonio", label: "Patrimônio" },
  { id: "trabalho", label: "Trabalho" },
  { id: "conta", label: "Conta" },
] as const;
