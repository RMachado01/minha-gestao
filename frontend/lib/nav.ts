import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  TrendingUp,
  CreditCard,
  Car,
  Warehouse,
  CirclePlus,
  Settings,
  List,
  CalendarCheck,
  Repeat,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: "principal" | "financas" | "patrimonio" | "trabalho" | "conta";
  /** If set, item only shows when this condition matches mg-uber-mode */
  uberOnly?: boolean;
  garagemOnly?: boolean;
}

/** Navegação principal. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard, group: "principal" },
  { href: "/lancamentos", label: "Lançamentos", icon: CirclePlus, group: "financas" },
  { href: "/transacoes", label: "Transações", icon: List, group: "financas" },
  { href: "/fluxo-caixa", label: "Fluxo de Caixa", icon: ArrowLeftRight, group: "financas" },
  { href: "/gastos", label: "Gastos", icon: PieChart, group: "financas" },
  { href: "/planejamento", label: "Planejamento", icon: CalendarCheck, group: "financas" },
  { href: "/recorrentes", label: "Recorrentes", icon: Repeat, group: "financas" },
  { href: "/cartoes", label: "Cartões", icon: CreditCard, group: "financas" },
  { href: "/investimentos", label: "Investimentos", icon: TrendingUp, group: "patrimonio" },
  { href: "/uber", label: "Uber", icon: Car, group: "trabalho", uberOnly: true },
  { href: "/garagem", label: "Garagem", icon: Warehouse, group: "trabalho", garagemOnly: true },
  { href: "/configuracoes", label: "Configurações", icon: Settings, group: "conta" },
];

export const NAV_GROUPS = [
  { id: "principal", label: "" },
  { id: "financas", label: "Finanças" },
  { id: "patrimonio", label: "Patrimônio" },
  { id: "trabalho", label: "Trabalho" },
  { id: "conta", label: "Conta" },
] as const;
