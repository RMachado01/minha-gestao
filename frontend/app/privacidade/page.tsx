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
          <h2 className="text-lg font-semibold text-ink">5. Compartilhamento e Operadores</h2>
          <p>
            Seus dados <strong>nao sao vendidos</strong> nem compartilhados para fins de
            marketing. Para operar o servico, utilizamos os seguintes operadores
            (subcontratados), todos com conexao criptografada (TLS):
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Vercel</strong> — hospedagem do aplicativo.</li>
            <li><strong>Supabase (PostgreSQL)</strong> — banco de dados, autenticacao e armazenamento.</li>
            <li><strong>Groq</strong> — provedor de inteligencia artificial (ver Secao 5.1).</li>
            <li><strong>Logo.dev</strong> — exibicao de logos de marcas (bancos e assinaturas), por dominio.</li>
            <li><strong>hCaptcha</strong> — protecao contra abuso no login/cadastro.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">5.1. Inteligencia Artificial e Transferencia Internacional</h2>
          <p>
            O assistente financeiro e a leitura de comprovantes por foto sao processados
            pela <strong>Groq</strong>, cujos servidores ficam nos <strong>Estados Unidos</strong>.
            Isso configura <strong>transferencia internacional de dados</strong> (LGPD Art. 33),
            realizada com base no seu consentimento e para a execucao do servico. Nesses
            recursos podem ser enviados:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Um <strong>resumo agregado</strong> da sua conta (totais e categorias do mes) quando voce usa o assistente — nunca a lista completa de transacoes.</li>
            <li>A <strong>foto do comprovante</strong> que voce escolher escanear, apenas para extrair valor, data e descricao.</li>
          </ul>
          <p className="mt-2">
            A imagem do comprovante e usada somente para a extracao no momento do envio e
            <strong> nao e armazenada</strong> pelo aplicativo. Segundo a Groq, os dados de API
            nao sao utilizados para treinar modelos. Voce pode usar o app normalmente sem
            esses recursos de IA.
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
          <h2 className="text-lg font-semibold text-ink">10. Encarregado (DPO) e Contato</h2>
          <p>
            Para exercer seus direitos, esclarecer duvidas sobre privacidade ou falar com o
            nosso <strong>Encarregado pelo Tratamento de Dados (DPO)</strong>, entre em contato
            pelo e-mail indicado na pagina de Configuracoes. Voce tambem pode usar as funcoes
            de exportacao e exclusao disponiveis na propria plataforma, e, se necessario,
            registrar reclamacao junto a <strong>ANPD</strong> (Autoridade Nacional de Protecao
            de Dados).
          </p>
        </section>
      </article>
    </main>
  );
}
