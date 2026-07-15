export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: "income" | "expense" | "benefit";
  categoria: string;
  conta: string;
  status: "pendente" | "pago" | "recebido";
  recorrente: boolean;
  formaPagamento: "pix" | "credit" | "cash" | "benefit";
}

export const transacoes: Transacao[] = [
  // Junho 2026
  { id: "t01", descricao: "Salário", valor: 6500.0, data: "2026-06-05", tipo: "income", categoria: "Salário", conta: "Nubank", status: "recebido", recorrente: true, formaPagamento: "pix" },
  { id: "t02", descricao: "Aluguel", valor: 1400.0, data: "2026-06-10", tipo: "expense", categoria: "Moradia", conta: "Nubank", status: "pago", recorrente: true, formaPagamento: "pix" },
  { id: "t03", descricao: "Supermercado Extra", valor: 387.62, data: "2026-06-08", tipo: "expense", categoria: "Alimentação", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t04", descricao: "Conta de luz", valor: 189.45, data: "2026-06-15", tipo: "expense", categoria: "Moradia", conta: "Nubank", status: "pago", recorrente: true, formaPagamento: "pix" },
  { id: "t05", descricao: "Netflix", valor: 55.9, data: "2026-06-12", tipo: "expense", categoria: "Assinatura", conta: "Itaú", status: "pago", recorrente: true, formaPagamento: "credit" },
  { id: "t06", descricao: "Uber corridas", valor: 94.8, data: "2026-06-14", tipo: "expense", categoria: "Transporte", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t07", descricao: "Freelance design", valor: 2200.0, data: "2026-06-18", tipo: "income", categoria: "Salário", conta: "Nubank", status: "recebido", recorrente: false, formaPagamento: "pix" },
  { id: "t08", descricao: "Farmácia Drogasil", valor: 67.3, data: "2026-06-20", tipo: "expense", categoria: "Saúde", conta: "Itaú", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t09", descricao: "Spotify", valor: 34.9, data: "2026-06-12", tipo: "expense", categoria: "Assinatura", conta: "Nubank", status: "pago", recorrente: true, formaPagamento: "credit" },
  { id: "t10", descricao: "iFood", valor: 52.9, data: "2026-06-22", tipo: "expense", categoria: "Alimentação", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t11", descricao: "Gasolina", valor: 220.0, data: "2026-06-25", tipo: "expense", categoria: "Transporte", conta: "Itaú", status: "pago", recorrente: false, formaPagamento: "cash" },
  { id: "t12", descricao: "Curso Udemy", valor: 29.9, data: "2026-06-27", tipo: "expense", categoria: "Educação", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t13", descricao: "VR Alimentação", valor: 880.0, data: "2026-06-05", tipo: "income", categoria: "Alimentação", conta: "Sodexo", status: "recebido", recorrente: true, formaPagamento: "benefit" },
  // Julho 2026
  { id: "t14", descricao: "Salário", valor: 6500.0, data: "2026-07-05", tipo: "income", categoria: "Salário", conta: "Nubank", status: "recebido", recorrente: true, formaPagamento: "pix" },
  { id: "t15", descricao: "Aluguel", valor: 1400.0, data: "2026-07-10", tipo: "expense", categoria: "Moradia", conta: "Nubank", status: "pendente", recorrente: true, formaPagamento: "pix" },
  { id: "t16", descricao: "Supermercado Pão de Açúcar", valor: 412.35, data: "2026-07-06", tipo: "expense", categoria: "Alimentação", conta: "Itaú", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t17", descricao: "Academia Smart Fit", valor: 109.9, data: "2026-07-01", tipo: "expense", categoria: "Saúde", conta: "Nubank", status: "pago", recorrente: true, formaPagamento: "credit" },
  { id: "t18", descricao: "Cinema", valor: 64.0, data: "2026-07-04", tipo: "expense", categoria: "Lazer", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t19", descricao: "Conta de água", valor: 78.2, data: "2026-07-08", tipo: "expense", categoria: "Moradia", conta: "Nubank", status: "pago", recorrente: true, formaPagamento: "pix" },
  { id: "t20", descricao: "Restaurante", valor: 126.0, data: "2026-07-05", tipo: "expense", categoria: "Alimentação", conta: "Itaú", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t21", descricao: "Gasolina", valor: 235.0, data: "2026-07-07", tipo: "expense", categoria: "Transporte", conta: "Itaú", status: "pago", recorrente: false, formaPagamento: "cash" },
  { id: "t22", descricao: "VR Alimentação", valor: 880.0, data: "2026-07-05", tipo: "income", categoria: "Alimentação", conta: "Sodexo", status: "recebido", recorrente: true, formaPagamento: "benefit" },
  { id: "t23", descricao: "Internet Vivo", valor: 119.9, data: "2026-07-09", tipo: "expense", categoria: "Moradia", conta: "Nubank", status: "pendente", recorrente: true, formaPagamento: "pix" },
  { id: "t24", descricao: "Livro técnico", valor: 89.9, data: "2026-07-03", tipo: "expense", categoria: "Educação", conta: "Nubank", status: "pago", recorrente: false, formaPagamento: "credit" },
  { id: "t25", descricao: "Dentista", valor: 350.0, data: "2026-07-11", tipo: "expense", categoria: "Saúde", conta: "Nubank", status: "pendente", recorrente: false, formaPagamento: "pix" },
];

export function transacoesFiltradas(filtro: {
  tipo?: string;
  categoria?: string;
  busca?: string;
}): Transacao[] {
  return transacoes.filter((t) => {
    if (filtro.tipo && t.tipo !== filtro.tipo) return false;
    if (filtro.categoria && t.categoria !== filtro.categoria) return false;
    if (filtro.busca) {
      const termo = filtro.busca.toLowerCase();
      if (!t.descricao.toLowerCase().includes(termo)) return false;
    }
    return true;
  });
}
