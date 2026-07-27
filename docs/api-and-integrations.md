# Rotas de API e integrações

## Rotas de servidor (`app/api/*`)

Todas são route handlers do Next (runtime Node quando indicado). Existem para
esconder chaves secretas ou varrer dados de vários usuários — o resto do app
fala direto com o Supabase pelo cliente.

| Rota | Método | Auth | O que faz |
|---|---|---|---|
| `/api/advisor` | POST | sessão Supabase | Proxy para o Groq (chat). Recebe `{question, context}`, devolve `{answer, model}`. Sem `GROQ_API_KEY` → 501 (cliente cai no modo por regras). |
| `/api/receipt` | POST | sessão Supabase | Extrai dados de um comprovante com o modelo de visão do Groq. Rejeita imagem > 3 MB. Não armazena a imagem. |
| `/api/push/subscribe` | POST | sessão Supabase | Salva/atualiza a inscrição Web Push do navegador (`push_subscriptions`, upsert por `endpoint`). |
| `/api/push/unsubscribe` | POST | sessão Supabase | Remove a inscrição do navegador atual. |
| `/api/push/test` | POST | sessão Supabase | Envia um push de teste para as inscrições do próprio usuário. Sem VAPID → 501. |
| `/api/push/cron` | GET | `CRON_SECRET` (Bearer) | Cron diário: lembra faturas que vencem amanhã. Usa a **service role** para varrer todos os usuários. |

Helpers de auth server-side:

- `lib/supabase/routeUser.ts` → `getRequestUserId(req)`: só o id do usuário (leitura).
- `lib/supabase/routeClient.ts` → `getRequestClient(req)`: client + id (permite escrever respeitando RLS do próprio usuário).
- `lib/supabase/admin.ts` → `createAdminClient()`: client com **service role** (ignora RLS). **Somente** em rotas confiáveis (cron). Nunca importar no cliente.

## Groq (LLM do MVP)

- API compatível com OpenAI: `https://api.groq.com/openai/v1/chat/completions`.
- Chave **server-side** `GROQ_API_KEY` (nunca `NEXT_PUBLIC`).
- Modelos: `GROQ_MODEL` (texto, padrão `llama-3.3-70b-versatile`) e `GROQ_VISION_MODEL` (visão/nota fiscal, padrão `llama-3.2-11b-vision-preview`). Confira IDs atuais em https://console.groq.com/docs/models.
- **Custo:** frações de centavo por chamada; free tier disponível. Escolhido como provedor do MVP até o lançamento.
- **LGPD:** o contexto enviado são **agregados do mês**, não a lista bruta de transações. Transferência internacional (EUA) declarada na política de privacidade.

## Web Push (VAPID)

Notificações push sem custo por mensagem (usa o serviço de push do próprio
navegador).

- Envio server-side: `lib/push/send.ts` (biblioteca `web-push`, VAPID), limpando inscrições expiradas (404/410).
- Service worker: handlers `push` e `notificationclick` em `public/sw.js`.
- Cliente: `lib/usePushNotifications.ts` (permissão + inscrição no `PushManager` + sincronização com o banco) e `components/security/NotificationSettings.tsx`.
- Chaves: gere com `npx web-push generate-vapid-keys`. A pública vai em **duas** variáveis — `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (exposta ao client, usada na inscrição) e `VAPID_PUBLIC_KEY` (server); a privada `VAPID_PRIVATE_KEY` é secreta. `VAPID_SUBJECT` é um `mailto:`.
- **iPhone:** só recebe push com o PWA **instalado na tela de início** (iOS 16.4+).

### Cron de notificações

- `vercel.json` agenda `GET /api/push/cron` diariamente (`0 11 * * *` UTC = 8h BRT).
- **Requer plano Vercel Pro** (cron). A Vercel injeta o `CRON_SECRET` no header `Authorization: Bearer`.
- Precisa de `SUPABASE_SERVICE_ROLE_KEY` para ler faturas de todos os usuários.
- **Escopo atual:** só lembrete de vencimento de fatura (naturalmente sem repetição, dispara na véspera). O aviso de "orçamento estourado" está pendente — exige um marcador de "já avisei" para não repetir todo dia.

## Logo.dev (logos de marca)

- Logos de bancos, bandeiras e assinaturas. Provedor: Logo.dev.
- Chave **publicável** (segura no client): `NEXT_PUBLIC_LOGO_DEV_TOKEN`. Já há um default no código.
- Alternativa: `NEXT_PUBLIC_LOGO_BASE` com padrão `{domain}/{size}` para outro provedor.
- No plano gratuito, uso comercial exige link de atribuição ao Logo.dev (há um no rodapé de Configurações).
- Código: `lib/brands.ts`, `lib/subscriptions.ts`, `components/ui/BrandLogo.tsx`.

## hCaptcha

- Protege login/cadastro quando `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` está definido.
- A **secret** fica no painel do Supabase (Authentication > Attack Protection), **não** no código.
- Sem a variável, os forms funcionam sem captcha (modo dev).

## brapi (cotações de mercado)

- O frontend **não** chama a brapi diretamente. Um job externo (GitHub Actions,
  `scripts/refresh_market_quotes.py`) busca as cotações e grava em
  `market_quote_cache`; o app só **lê** essa tabela (read-only).
- Secrets no GitHub: `BRAPI_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`.
