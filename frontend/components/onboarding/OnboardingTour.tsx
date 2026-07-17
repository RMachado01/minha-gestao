"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePersonalization } from "@/lib/usePersonalization";

const STEPS = [
  { id: "overview", title: "Sua visão geral", description: "Aqui você acompanha saldo, receitas, gastos e próximos compromissos. A conta começa vazia: tudo vem dos seus lançamentos." },
  { id: "new-launch", title: "Comece por um lançamento", description: "Use este botão para registrar uma receita ou despesa. Compras em cartão de crédito ou VR/VA podem ser vinculadas ao cartão correto." },
  { id: "cards", title: "Cartões e vencimentos", description: "Cadastre cartões de crédito e alimentação. Faturas e saldos ficam organizados nesta área." },
  { id: "goals", title: "Sonhos, metas e projeções", description: "Defina objetivos, simule aportes e use a Inteligência da conta em qualquer tela para interpretar seus dados." , drawer: true },
  { id: "settings", title: "Perfil e preferências", description: "Ajuste tema, dados pessoais e modo motorista. No celular, todas as demais funções ficam no menu Mais.", drawer: true },
] as const;

type TargetRect = Pick<DOMRect, "top" | "left" | "right" | "bottom" | "width" | "height">;

function visibleTarget(id: string): HTMLElement | null {
  const mobile = window.innerWidth < 1024;
  const selector = mobile ? `[data-tour-mobile="${id}"]` : `[data-tour-desktop="${id}"]`;
  return [...document.querySelectorAll<HTMLElement>(selector)].find((element) => element.offsetParent !== null) ?? null;
}

export function OnboardingTour() {
  const { name, setName } = usePersonalization();
  const [step, setStep] = useState(0);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const finish = useCallback(() => {
    if (storageKey) localStorage.setItem(storageKey, "true");
    window.dispatchEvent(new CustomEvent("mg-close-mobile-nav"));
    setOpen(false);
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const fullName = data.user.user_metadata?.full_name;
      if (!name && typeof fullName === "string" && fullName.trim()) setName(fullName.trim());
      const key = `mg-onboarding-complete:${data.user.id}`;
      setStorageKey(key);
      if (localStorage.getItem(key) !== "true") setOpen(true);
    });
    return () => { active = false; };
  }, [name, setName]);

  useEffect(() => {
    if (!open) return;
    const current = STEPS[step];
    if (window.innerWidth < 1024 && "drawer" in current && current.drawer) window.dispatchEvent(new CustomEvent("mg-open-mobile-nav"));
    else window.dispatchEvent(new CustomEvent("mg-close-mobile-nav"));

    let attempts = 0;
    let timer = 0;
    const locate = () => {
      const target = visibleTarget(current.id);
      if (target) {
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const next = target.getBoundingClientRect();
        setRect({ top: next.top, left: next.left, right: next.right, bottom: next.bottom, width: next.width, height: next.height });
      } else if (attempts < 12) {
        attempts += 1;
        timer = window.setTimeout(locate, 100);
      }
    };
    timer = window.setTimeout(locate, 80);
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusDialog = window.requestAnimationFrame(() => dialogRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [finish, open]);

  if (!open) return null;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const desktopTooltip = rect && window.innerWidth >= 640;
  const tooltipStyle = desktopTooltip ? {
    top: Math.min(window.innerHeight - 310, Math.max(20, rect.top)),
    left: rect.right + 24 + 380 < window.innerWidth ? rect.right + 24 : Math.max(20, rect.left - 404),
  } : undefined;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[100]" aria-live="polite">
      {rect && <div aria-hidden className="pointer-events-none fixed rounded-2xl ring-4 ring-accent ring-offset-4 ring-offset-transparent transition-all duration-300" style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgb(0 0 0 / .58), 0 12px 40px rgb(0 0 0 / .3)" }} />}
      {!rect && <div aria-hidden className="pointer-events-none fixed inset-0 bg-black/60 backdrop-blur-sm" />}
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" aria-describedby="onboarding-description" className="ios-glass fixed inset-x-4 bottom-[6.5rem] z-[102] max-h-[70dvh] overflow-y-auto rounded-[1.5rem] p-5 shadow-2xl outline-none sm:inset-x-auto sm:bottom-auto sm:w-[380px] sm:p-6" style={tooltipStyle}>
        <div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] text-accent"><Compass className="size-5" /></span><button type="button" onClick={finish} className="grid size-11 place-items-center rounded-xl text-ink-muted hover:bg-[color-mix(in_oklab,var(--color-ink)_5%,transparent)] hover:text-ink" aria-label="Pular tour"><X className="size-4" /></button></div>
        <p className="eyebrow mt-5 text-accent">Passo {step + 1} de {STEPS.length}</p>
        <h2 id="onboarding-title" className="display-font mt-2 text-2xl font-medium tracking-[-.025em] text-ink">{current.title}</h2>
        <p id="onboarding-description" className="mt-2 text-sm leading-6 text-ink-soft">{current.description}</p>
        <div className="mt-5 flex items-center gap-2" aria-hidden>{STEPS.map((item, index) => <span key={item.id} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-[var(--color-line-strong)]"}`} />)}</div>
        <div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => step === 0 ? finish() : setStep((value) => value - 1)} className="inline-flex items-center gap-1 px-2 py-2 text-sm font-medium text-ink-muted hover:text-ink">{step === 0 ? "Pular" : <><ArrowLeft className="size-4" />Voltar</>}</button><button type="button" onClick={() => isLast ? finish() : setStep((value) => value + 1)} className="btn-primary">{isLast ? <><Check className="size-4" />Concluir</> : <>Próximo<ArrowRight className="size-4" /></>}</button></div>
      </section>
    </div>
  );
}
