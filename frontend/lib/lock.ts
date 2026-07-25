/**
 * Bloqueio do app por PIN (camada de privacidade local, tipo "app lock").
 *
 * O PIN é derivado com PBKDF2 (120k iterações + salt aleatório) e só o hash
 * fica no localStorage — o PIN em si nunca é armazenado. É uma proteção de
 * conveniência contra acesso casual ao aparelho; a segurança real dos dados
 * continua no Supabase Auth (sessão). Por ser client-side, não substitui a
 * autenticação — apenas adiciona uma tela de desbloqueio.
 */

const HASH_KEY = "mg-lock"; // localStorage: "saltHex:derivedHex"
const UNLOCK_KEY = "mg-lock-ok"; // sessionStorage: "1" enquanto desbloqueado nesta sessão
const CHANGE_EVENT = "mg-lock-change";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 120_000 },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export function isLockEnabled(): boolean {
  try {
    return !!localStorage.getItem(HASH_KEY);
  } catch {
    return false;
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(pin, salt);
  localStorage.setItem(HASH_KEY, `${toHex(salt)}:${derived}`);
  markUnlocked();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearPin(): void {
  try {
    localStorage.removeItem(HASH_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(HASH_KEY);
    if (!stored) return false;
    const [saltHex, derivedHex] = stored.split(":");
    if (!saltHex || !derivedHex) return false;
    const derived = await derive(pin, fromHex(saltHex));
    return derived === derivedHex;
  } catch {
    return false;
  }
}

/** Observa ativação/desativação do bloqueio (para o overlay reagir). */
export function onLockChange(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
