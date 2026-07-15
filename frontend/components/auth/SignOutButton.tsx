"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

interface SignOutButtonProps {
  compact?: boolean;
  className?: string;
}
export function SignOutButton({ compact = false, className }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={cn(
        compact
          ? "grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-rose-400/10 hover:text-neg"
          : "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-rose-400/10 hover:text-neg",
        className,
      )}
      aria-label={compact ? "Sair da conta" : undefined}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {!compact && <span>{loading ? "Saindo..." : "Sair"}</span>}
    </button>
  );
}
