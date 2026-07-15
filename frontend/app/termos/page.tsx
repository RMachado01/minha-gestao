import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/cadastro"
        className="mb-8 inline-flex items-center gap-2 text-sm text-accent hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar ao cadastro
      </Link>

      <h1 className="text-3xl font-semibold text-ink">Termos de Uso</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Versao 1.0 — Ultima atualizacao: 13 de julho de 2026
      </p>

      <article className="prose-custom mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-lg font-semibold text-ink">1. Objeto</h2>
          <p>
            O Minha Gestao e uma plataforma de gestao financeira pessoal que permite ao
            usuario registrar receitas, despesas, investimentos, cartoes de credito e
            atividades como motorista de aplicativo. O servico e oferecido &quot;como esta&quot;
            para uso pessoal e nao constitui assessoria financeira.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">2. Cadastro e Conta</h2>
          <p>
            O usuario deve fornecer informacoes verdadeiras no cadastro. Cada conta e
            pessoal e intransferivel. O usuario e responsavel por manter a seguranca de
            suas credenciais. Contas compartilhadas entre familiares utilizam o modulo de
            grupo familiar, onde cada pessoa possui login proprio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">3. Uso Aceitavel</h2>
          <p>
            O usuario se compromete a nao utilizar a plataforma para atividades ilicitas,
            nao tentar acessar dados de outros usuarios e nao realizar engenharia reversa
            do sistema.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">4. Dados e Privacidade</h2>
          <p>
            O tratamento de dados pessoais segue a Lei Geral de Protecao de Dados (LGPD —
            Lei 13.709/2018). Consulte nossa{" "}
            <Link href="/privacidade" className="text-accent hover:underline">
              Politica de Privacidade
            </Link>{" "}
            para detalhes sobre coleta, uso, armazenamento e seus direitos como titular.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">5. Propriedade Intelectual</h2>
          <p>
            Todo o conteudo da plataforma (codigo, design, marca) e de propriedade do
            Minha Gestao. Os dados financeiros inseridos pertencem ao usuario.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">6. Limitacao de Responsabilidade</h2>
          <p>
            O Minha Gestao nao se responsabiliza por decisoes financeiras tomadas com base
            nas informacoes exibidas na plataforma. Os dados sao inseridos e mantidos
            pelo proprio usuario.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">7. Cancelamento e Exclusao</h2>
          <p>
            O usuario pode solicitar a exclusao de sua conta a qualquer momento em
            Configuracoes. Todos os dados serao removidos permanentemente, conforme
            previsto na LGPD (Art. 18).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">8. Alteracoes</h2>
          <p>
            Estes termos podem ser atualizados. O usuario sera notificado sobre
            alteracoes relevantes e devera aceitar a nova versao para continuar usando o
            servico.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">9. Foro</h2>
          <p>
            Fica eleito o foro da comarca do domicilio do usuario para dirimir quaisquer
            controversias.
          </p>
        </section>
      </article>
    </main>
  );
}
