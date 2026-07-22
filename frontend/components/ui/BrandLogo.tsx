"use client";

import { useState } from "react";
import { logoUrl } from "@/lib/brands";
import { cn } from "@/lib/cn";

interface BrandLogoProps {
  /** Nome exibido e usado para a inicial do fallback. */
  label: string;
  /** Domínio oficial da marca (ex.: "spotify.com"). Sem domínio → só fallback. */
  domain?: string | null;
  /** Cor de marca do fallback (fundo do avatar com inicial). */
  color: string;
  /** Cor de texto legível sobre `color`. */
  textColor?: string;
  /** Lado do avatar em px. */
  size?: number;
  className?: string;
}

/**
 * Avatar de marca: exibe o logo real da empresa (bancos, bandeiras, serviços
 * de assinatura) buscado por domínio. Se o logo não existir ou falhar ao
 * carregar, degrada para um círculo com a inicial na cor da marca — nunca
 * quebra o layout nem depende do serviço externo estar disponível.
 */
export function BrandLogo({
  label,
  domain,
  color,
  textColor = "#ffffff",
  size = 36,
  className,
}: BrandLogoProps) {
  const src = logoUrl(domain, Math.max(64, size * 2));
  // Guarda a URL que falhou (em vez de um booleano) para que a troca de marca
  // volte a tentar o novo logo sem precisar de um efeito de reset.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showLogo = src !== null && failedSrc !== src;
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: showLogo ? "#ffffff" : color,
        color: textColor,
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.10)",
      }}
      aria-hidden="true"
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span
          className="font-bold leading-none"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initial}
        </span>
      )}
    </span>
  );
}
