/**
 * Pegada de coelho — ícone da inteligência do app. Usa `currentColor`, então
 * herda a cor accent de IA de onde é exibida.
 */
export function BunnyPaw({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* pata traseira (alongada, característica do coelho) */}
      <ellipse cx="12" cy="15.4" rx="4.6" ry="6" />
      {/* dedos, em arco */}
      <ellipse cx="6.6" cy="8.6" rx="1.7" ry="2.5" transform="rotate(-18 6.6 8.6)" />
      <ellipse cx="10.2" cy="6.2" rx="1.8" ry="2.7" transform="rotate(-6 10.2 6.2)" />
      <ellipse cx="13.8" cy="6.2" rx="1.8" ry="2.7" transform="rotate(6 13.8 6.2)" />
      <ellipse cx="17.4" cy="8.6" rx="1.7" ry="2.5" transform="rotate(18 17.4 8.6)" />
    </svg>
  );
}
