import webpush from "web-push";

/**
 * Envio de Web Push server-side. As chaves VAPID ficam só no servidor.
 * Configuramos o web-push de forma preguiçosa (só quando há chaves), para o
 * build não quebrar quando o recurso ainda não foi configurado.
 */

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Rota para abrir ao tocar na notificação (ex.: "/cartoes"). */
  url?: string;
  tag?: string;
}

let configured = false;

/** Configura o VAPID uma única vez. Retorna false se faltar chave. */
export function isPushConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    const subject = process.env.VAPID_SUBJECT || "mailto:contato@minhagestao.app";
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface SendResult {
  /** Endpoints que retornaram 404/410 e devem ser removidos do banco. */
  expiredEndpoints: string[];
  sent: number;
}

/**
 * Envia a mesma mensagem para várias inscrições. Inscrições expiradas
 * (404/410) são coletadas para limpeza pelo chamador.
 */
export async function sendPush(
  subscriptions: PushSubscriptionRecord[],
  message: PushMessage,
): Promise<SendResult> {
  const payload = JSON.stringify(message);
  const expiredEndpoints: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        // Outros erros (rede, 5xx do serviço de push) são silenciados: o próximo
        // ciclo tenta de novo.
      }
    }),
  );

  return { expiredEndpoints, sent };
}
