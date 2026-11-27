import { useMemo } from 'react';
import type { Criterion, ErrorType, GradeError } from '@shared/types.ts';
import { Chip, ProgressBar } from '@/components/ui';
import { diffTokens } from './diffTokens';

export const ERROR_LABEL: Record<ErrorType, string> = {
  grammar: 'Ngữ pháp',
  vocabulary: 'Từ vựng',
  spelling: 'Chính tả',
  punctuation: 'Dấu câu',
  word_order: 'Trật tự từ',
  meaning: 'Nghĩa',
};

const ERROR_TONE: Record<ErrorType, 'red' | 'indigo' | 'yellow' | 'gray' | 'green'> = {
  grammar: 'red',
  vocabulary: 'indigo',
  spelling: 'yellow',
  punctuation: 'gray',
  word_order: 'green',
  meaning: 'red',
};

export function InlineDiff({ original, corrected }: { original: string; corrected: string }) {
  const tokens = useMemo(() => diffTokens(original, corrected), [original, corrected]);
  return (
    <p className="text-[18px] leading-[2.05] whitespace-pre-wrap sm:text-[20px]">
      {tokens.map((t, i) =>
        t.kind === 'same' ? (
          <span key={i}>{t.text}</span>
        ) : t.kind === 'removed' ? (
          <del key={i} className="mr-1 rounded bg-bad-soft px-0.5 text-bad decoration-bad decoration-2" aria-label={`bỏ: ${t.text}`}>
            {t.text}
          </del>
        ) : (
          <ins key={i} className="rounded bg-good-soft px-1 font-semibold text-good no-underline" aria-label={`thêm: ${t.text}`}>
            {t.text}
          </ins>
        ),
      )}
    </p>
  );
}

export function ErrorCard({ error }: { error: GradeError }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)]">
      <Chip tone={ERROR_TONE[error.type]}>{ERROR_LABEL[error.type]}</Chip>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          <span className="text-bad line-through decoration-2">{error.original}</span>
          <span className="mx-2 text-muted" aria-hidden>→</span>
          <span className="sr-only"> sửa thành </span>
          <span className="text-good">{error.correction}</span>
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink/85">{error.explanation_vi}</p>
      </div>
    </li>
  );
}

const scoreTone = (s: number) => (s >= 8.5 ? 'ok' : s >= 6.5 ? 'indigo' : s >= 5 ? 'warn' : 'danger') as 'ok' | 'indigo' | 'warn' | 'danger';

export function CriteriaBars({ criteria, overall }: { criteria: Criterion[]; overall: number }) {
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-[40px] leading-none font-extrabold">{overall.toFixed(1)}</span>
        <span className="text-muted">/10</span>
      </div>
      <dl className="mt-4 space-y-3">
        {criteria.map((c) => (
          <div key={c.key}>
            <div className="mb-1 flex justify-between text-[14px]">
              <dt className="font-semibold">{c.label_vi}</dt>
              <dd className="text-muted">{c.score}/10</dd>
            </div>
            <ProgressBar value={c.score} max={10} tone={scoreTone(c.score)} label={c.label_vi} />
          </div>
        ))}
      </dl>
    </div>
  );
}

const CONFETTI_COLORS = ['#5b5bd6', '#ffd23f', '#18794e', '#e5484d', '#8b8bf0'];

export function Celebration() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: 'translateY(-20vh)',
          }}
        />
      ))}
    </div>
  );
}
