const logoSrc = new URL('../../assets/logo_3.svg', import.meta.url).toString();

export function AppLogo({
  className = '',
  inverted = false,
  alt = 'Logo',
}: {
  className?: string;
  inverted?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`object-contain ${inverted ? 'brightness-0 invert' : ''} ${className}`}
      draggable={false}
    />
  );
}
