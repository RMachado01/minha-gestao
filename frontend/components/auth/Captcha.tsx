"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

export interface CaptchaHandle {
  resetCaptcha: () => void;
}

interface CaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

// Sem site key configurada (dev local / protótipo), o captcha fica desligado
// e os forms seguem funcionando normalmente — mesmo padrão de fallback do
// createClient() do Supabase.
export const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha(
  { onVerify, onExpire },
  ref
) {
  const captchaRef = useRef<HCaptcha>(null);

  useImperativeHandle(ref, () => ({
    resetCaptcha: () => captchaRef.current?.resetCaptcha(),
  }));

  if (!SITE_KEY) return null;

  return (
    <div className="flex justify-center">
      <HCaptcha ref={captchaRef} sitekey={SITE_KEY} theme="dark" onVerify={onVerify} onExpire={onExpire} />
    </div>
  );
});

export function isCaptchaEnabled(): boolean {
  return Boolean(SITE_KEY);
}
