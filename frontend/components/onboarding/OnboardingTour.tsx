"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Compass, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePersonalization } from "@/lib/usePersonalization";

const STEPS = [
  {
    title: "Bem-vindo à sua gestão",
    description: "Sua conta começa vazia e mostra somente os dados que você cadastrar. Vamos conhecer o essencial.",
    href: "/",
  },
  {
    title: "Registre entradas e gastos",
    description: "Use Novo lançamento para adicionar receitas, despesas, VR ou VA. Seus indicadores serão calculados a partir desses registros.",
    href: "/lancamentos",
  },
  {
    title: "Organize cartões e vencimentos",
    description: "Cadastre cada cartão para associar compras à fatura correta e acompanhar datas de fechamento e vencimento.",
    href: "/cartoes",
  },
  {
    title: "Personalize sua experiência",
    description: "Em Configurações você ajusta tema, perfil e ativa o modo de motorista de aplicativo quando precisar.",
    href: "/configuracoes",
  },
] as const;

export function OnboardingTour() {
  const router = useRouter();
  const { name, setName } = usePersonalization();
  const [step, setStep] = useState(0);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

    return () => {
      active = false;
    };
  }, [name, setName]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function finish() {
    if (storageKey) localStorage.setItem(storageKey, "true");
    setOpen(false);
    router.push("/");
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    router.push(STEPS[nextStep].href);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="ios-glass w-full max-w-lg rounded-[2rem] p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent)_18%,transparent)] text-accent">
            <Compass className="size-5" />
          </span>
          <button type="button" onClick={finish} className="grid size-10 place-items-center rounded-xl text-ink-muted hover:bg-white/5 hover:text-ink" aria-label="Pular tour">
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[.18em] text-accent">
          Passo {step + 1} de {STEPS.length}
        </p>
        <h2 id="onboarding-title" className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{current.description}</p>

        <div className="mt-7 flex items-center gap-2" aria-hidden>
          {STEPS.map((item, index) => (
            <span key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-accent" : "bg-[var(--color-line-strong)]"}`} />
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={finish} className="px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink">
            Pular tour
          </button>
          <button type="button" onClick={next} className="btn-primary">
            {isLast ? <><Check className="size-4" /> Começar a usar</> : <>Próximo <ArrowRight className="size-4" /></>}
          </button>
        </div>
      </section>
    </div>
  );
}
