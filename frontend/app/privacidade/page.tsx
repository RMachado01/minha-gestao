import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/cadastro"
        className="mb-8 inline-flex items-center gap-2 text-sm text-accent hover:underline"
      >
        <ArrowLeft className="size-4" /> Voltar ao cadastro
      </Link>

      <h1 className="text-3xl font-semibold text-ink">Politica de Privacidade</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Versao 1.0 — Ultima atualizacao: 13 de julho de 2026
      </p>

      <article className="prose-custom mt-8 space-y-6 text-sm leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-lg font-semibold text-ink">1. Controlador</h2>
          <p>
            O controlador dos dados pessoais e o Minha Gestao, responsavel pelas
            decisoes referentes ao tratamento dos dados coletados nesta plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">2. Dados Coletados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Dados de cadastro:</strong> nome completo, endereco de e-mail.
            </li>
            <li>
              <strong>Dados financeiros:</strong> transacoes, categorias, cartoes de
              credito (apelido e bandeira — nunca o numero completo), investimentos,
              veiculos e registros de corridas.
            </li>
            <li>
              <strong>Dados de uso:</strong> preferencias de tema, cor de destaque,
              modulo ativo (Uber/Garagem).
            </li>
            <li>
              <strong>Dados tecnicos:</strong> endereco IP e user-agent no momento do
              aceite dos termos (para fins de auditoria legal).
            </li>
          </ul>
          <p className="mt-2">
            Nao coletamos CPF, RG, dados biometricos ou dados sensiveis alem do
            estritamente necessario.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">3. Finalidade</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Prover o servico de gestao financeira pessoal.</li>
            <li>Autenticar o usuario e proteger sua conta.</li>
            <li>Exibir dashboards, graficos e KPIs com base nos dados do usuario.</li>
            <li>Compartilhar informacoes selecionadas com dependentes familiares, quando autorizado.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">4. Base Legal (LGPD Art. 7)</h2>
          <p>
            O tratamento se baseia no <strong>consentimento do titular</strong> (Art. 7, I),
            manifestado no momento do cadastro ao aceitar estes termos, e na{" "}
            <strong>execucao de contrato</strong> (Art. 7, V) para prestacao do servico.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">5. Compartilhamento</h2>
          <p>
            Seus dados nao sao vendidos nem compartilhados com terceiros para fins de
            marketing. Os dados trafegam apenas entre o frontend (hospedado na Vercel),
            o backend (API) e o banco de dados (Supabase/PostgreSQL), todos com conexao
            criptografada (TLS).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">6. Armazenamento e Seguranca</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Senhas sao armazenadas em hash (bcrypt) pelo Supabase Auth.</li>
            <li>Dados em transito protegidos por HTTPS/TLS.</li>
            <li>
              Row Level Security (RLS) no PostgreSQL garante que cada usuario so acessa
              seus proprios dados.
            </li>
            <li>Tokens JWT com expiracao para autenticacao de sessao.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">7. Seus Direitos (LGPD Art. 18)</h2>
          <p>Voce tem direito a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Acesso:</strong> visualizar todos os seus dados na plataforma.
            </li>
            <li>
              <strong>Correcao:</strong> editar seus dados pessoais em Configuracoes.
            </li>
            <li>
              <strong>Exclusao:</strong> solicitar a remocao completa da sua conta e
              dados em Configuracoes.
            </li>
            <li>
              <strong>Portabilidade:</strong> exportar seus dados em formato JSON ou CSV.
            </li>
            <li>
              <strong>Revogacao do consentimento:</strong> ao excluir sua conta, o
              consentimento e automaticamente revogado.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">8. Retencao</h2>
          <p>
            Os dados sao mantidos enquanto a conta estiver ativa. Apos exclusao da conta,
            todos os dados sao removidos permanentemente em ate 30 dias (cascade no banco
            de dados).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">9. Cookies e Armazenamento Local</h2>
          <p>
            Utilizamos cookies de sessao (Supabase Auth) e localStorage para
            preferencias visuais (tema, cor de destaque, foto de perfil). Nenhum cookie
            de rastreamento de terceiros e utilizado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">10. Contato</h2>
          <p>
            Para exercer seus direitos ou esclarecer duvidas sobre privacidade, entre em
            contato pelo e-mail indicado na pagina de Configuracoes ou utilize as funcoes
            de exportacao e exclusao disponiveis na propria plataforma.
          </p>
        </section>
      </article>
    </main>
  );
}
