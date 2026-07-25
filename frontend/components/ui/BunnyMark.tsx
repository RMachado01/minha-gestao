/**
 * Marca do app: coelho em contorno (line art). Usa `currentColor`, então herda
 * a cor do container (ex.: branco sobre o quadrado accent). Otimizado para
 * tamanhos pequenos (viewBox 24, traço proporcional).
 */
export function BunnyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <circle cx="12" cy="15.4" r="4.7" />
        <path d="M10.7 11.4 C 9.2 8.9, 9.2 5.3, 10.3 4.2 C 11.5 5.4, 11.8 8.9, 11.7 11.2" />
        <path d="M13.3 11.4 C 14.8 8.9, 14.8 5.3, 13.7 4.2 C 12.5 5.4, 12.2 8.9, 12.3 11.2" />
      </g>
      <g fill="currentColor">
        <circle cx="10.5" cy="15" r=".85" />
        <circle cx="13.5" cy="15" r=".85" />
      </g>
    </svg>
  );
}
