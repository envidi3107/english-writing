import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Star } from 'lucide-react';
import type { Stars as StarCount } from '@shared/types.ts';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
export { cx };

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-indigo text-white shadow-[var(--shadow-tactile-indigo)] hover:bg-[#5050cc] active:translate-y-[2px] active:shadow-none',
  secondary: 'bg-surface text-ink border-2 border-line shadow-[var(--shadow-tactile)] hover:border-indigo/40 active:translate-y-[2px] active:shadow-none',
  ghost: 'text-indigo hover:bg-indigo-soft',
  danger: 'bg-bad text-white shadow-[0_3px_0_#b4272c] active:translate-y-[2px] active:shadow-none',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,background-color,border-color] select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'lg' ? 'h-13 px-6 text-[17px]' : 'h-11 px-4 text-[15px]',
        BUTTON_STYLES[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner small />}
      {children}
    </button>
  );
});

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('bg-surface rounded-2xl border border-line shadow-[var(--shadow-tactile)]', className)} {...rest} />;
}

type Tone = 'indigo' | 'green' | 'red' | 'yellow' | 'gray';
const CHIP_TONES: Record<Tone, string> = {
  indigo: 'bg-indigo-soft text-indigo-deep',
  green: 'bg-good-soft text-good',
  red: 'bg-bad-soft text-bad',
  yellow: 'bg-xp text-xp-ink',
  gray: 'bg-[#eef0f8] text-muted',
};

export function Chip({ tone = 'indigo', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx('inline-flex h-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold whitespace-nowrap', CHIP_TONES[tone], className)}
      {...rest}
    />
  );
}

export function ProgressBar({ value, max, tone = 'indigo', label, className }: { value: number; max: number; tone?: 'indigo' | 'ok' | 'warn' | 'danger'; label?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = { indigo: 'bg-indigo', ok: 'bg-good', warn: 'bg-[#e6a23c]', danger: 'bg-bad' }[tone];
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cx('h-2.5 w-full overflow-hidden rounded-full bg-line/70', className)}
    >
      <div className={cx('h-full rounded-full transition-[width] duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stars({ value, size = 18, className }: { value: StarCount | number; size?: number; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} aria-label={`${value} trên 3 sao`} role="img">
      {[1, 2, 3].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2.2}
          className={i <= value ? 'fill-xp text-[#e9b500]' : 'fill-transparent text-line'}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function Spinner({ small, label = 'Đang tải' }: { small?: boolean; label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <span
        className={cx(
          'inline-block animate-spin rounded-full border-[3px] border-current border-r-transparent',
          small ? 'h-4 w-4' : 'h-7 w-7 text-indigo',
        )}
      />
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-14 text-center">
      <div className="mb-3 text-4xl" aria-hidden>✏️</div>
      <h2 className="text-xl">{title}</h2>
      {children && <p className="mt-2 text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-[15px] text-[#a1262b]">
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}

const fieldBase =
  'w-full rounded-xl border-2 border-line bg-surface px-3.5 py-2.5 text-[16px] text-ink placeholder:text-muted/70 focus:border-indigo focus:outline-none';

interface FieldShellProps {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  id: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, id, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[15px] font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <div className="text-[13px] text-muted">{hint}</div>}
      {error && <div className="text-[13px] font-medium text-bad">{error}</div>}
    </div>
  );
}

export function TextField({ label, error, hint, id, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null; hint?: ReactNode; id: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <input id={id} className={cx(fieldBase, 'h-12', error && 'border-bad', className)} aria-invalid={!!error} {...rest} />
    </FieldShell>
  );
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string | null; hint?: ReactNode; id: string }>(
  function TextAreaField({ label, error, hint, id, className, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} id={id}>
        <textarea ref={ref} id={id} className={cx(fieldBase, 'min-h-28 leading-relaxed', error && 'border-bad', className)} aria-invalid={!!error} {...rest} />
      </FieldShell>
    );
  },
);
