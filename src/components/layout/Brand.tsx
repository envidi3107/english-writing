import { Link } from 'react-router-dom';

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#5b5bd6" />
      <path d="M18 44l4-12 18-18 8 8-18 18z" fill="#fff" />
      <path d="M18 44l12-4-8-8z" fill="#ffd23f" />
    </svg>
  );
}

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-lg font-extrabold tracking-tight text-ink">
      <BrandMark />
      <span className="text-[19px]">VietWrite</span>
    </Link>
  );
}

/** A learner sentence with teacher marks — the app's visual signature. */
export function MarkedSentence({ className = '' }: { className?: string }) {
  return (
    <p className={`leading-[1.9] ${className}`}>
      My father <del className="text-bad decoration-bad decoration-[3px]">work</del>{' '}
      <ins className="rounded-md bg-good-soft px-1 font-semibold text-good no-underline">works</ins> in{' '}
      <ins className="rounded-md bg-good-soft px-1 font-semibold text-good no-underline">a</ins> bank, and he{' '}
      <del className="text-bad decoration-bad decoration-[3px]">go</del>{' '}
      <ins className="rounded-md bg-good-soft px-1 font-semibold text-good no-underline">goes</ins> there by bus.
    </p>
  );
}
