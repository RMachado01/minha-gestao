/**
 * Pegada de coelho (rosa) — ícone da inteligência do app. Cor fixa rosa com um
 * contorno mais escuro, para leitura clara em qualquer fundo.
 */
export function BunnyPaw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="#ff8fb0" stroke="#d85f86" strokeWidth="0.7" strokeLinejoin="round">
        {/* coxim principal, cheio e arredondado */}
        <path d="M12 22.2c-3.9 0-6.4-2.3-6.4-5 0-2.7 2.9-4.6 6.4-4.6s6.4 1.9 6.4 4.6c0 2.7-2.5 5-6.4 5z" />
        {/* dedos, em arco */}
        <ellipse cx="5.7" cy="9.2" rx="2.5" ry="3.2" />
        <ellipse cx="9.9" cy="6.1" rx="2.6" ry="3.4" />
        <ellipse cx="14.1" cy="6.1" rx="2.6" ry="3.4" />
        <ellipse cx="18.3" cy="9.2" rx="2.5" ry="3.2" />
      </g>
    </svg>
  );
}
