interface LogoProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const box = size === 'sm' ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-base';
  const text = size === 'sm' ? 'text-base' : 'text-lg';

  return (
    <div className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span
        className={`grid place-items-center rounded-lg bg-brand-600 text-white shadow-sm ${box}`}
      >
        S
      </span>
      <span className={text}>ShopSphere</span>
    </div>
  );
}
