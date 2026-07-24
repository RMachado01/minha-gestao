/**
 * Marca do app: coelho minimalista. Usa `currentColor` no corpo (herda a cor
 * do container, ex.: branco sobre o quadrado accent) e a cor do accent nos
 * olhos, criando o efeito de "olhos vazados" quando exibido sobre o accent.
 */
export function BunnyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="214" cy="176" rx="30" ry="90" transform="rotate(-12 214 176)" />
        <ellipse cx="298" cy="176" rx="30" ry="90" transform="rotate(12 298 176)" />
        <circle cx="256" cy="330" r="106" />
      </g>
      <g fill="var(--color-accent)">
        <circle cx="225" cy="322" r="12" />
        <circle cx="287" cy="322" r="12" />
      </g>
    </svg>
  );
}
