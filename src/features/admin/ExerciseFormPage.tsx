import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, X } from 'lucide-react';
import type { ExerciseType } from '@shared/types.ts';
import { Button, Card, ErrorNote, PageSpinner, TextAreaField, TextField } from '@/components/ui';
import type { ExerciseRow } from '@/lib/db';
import { fetchAdminTree, upsertExercise } from './api';
import { TestGradePanel } from './TestGradePanel';

export interface ExerciseForm {
  topic_id: string;
  type: ExerciseType;
  title: string;
  prompt: string;
  source_text: string;
  reference_answer: string;
  min_words: string;
  max_words: string;
  vocabulary: string[];
  starter: string;
  is_published: boolean;
}

const EMPTY: ExerciseForm = {
  topic_id: '', type: 'paragraph', title: '', prompt: '', source_text: '', reference_answer: '',
  min_words: '', max_words: '', vocabulary: [], starter: '', is_published: true,
};

const isTranslation = (t: ExerciseType) => t !== 'paragraph';

export function validateExerciseForm(f: ExerciseForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!f.topic_id) errors.topic_id = 'Hãy chọn chủ đề.';
  if (!f.title.trim()) errors.title = 'Hãy nhập tên bài.';
  if (!f.prompt.trim()) errors.prompt = 'Hãy nhập đề bài.';
  if (isTranslation(f.type) && !f.source_text.trim()) errors.source_text = 'Bài dịch cần có văn bản nguồn.';
  if (!isTranslation(f.type)) {
    const min = f.min_words === '' ? null : Number(f.min_words);
    const max = f.max_words === '' ? null : Number(f.max_words);
    if ((min !== null && (!Number.isInteger(min) || min < 0)) || (max !== null && (!Number.isInteger(max) || max < 0))) {
      errors.min_words = 'Số từ phải là số nguyên không âm.';
    } else if (min !== null && max !== null && min > max) {
      errors.min_words = 'Số từ tối thiểu phải nhỏ hơn hoặc bằng số từ tối đa.';
    }
  }
  return errors;
}

function toForm(e: ExerciseRow): ExerciseForm {
  return {
    topic_id: e.topic_id, type: e.type, title: e.title, prompt: e.prompt, source_text: e.source_text ?? '',
    reference_answer: e.reference_answer ?? '', min_words: e.min_words?.toString() ?? '', max_words: e.max_words?.toString() ?? '',
    vocabulary: e.hints.vocabulary ?? [], starter: e.hints.starter ?? '', is_published: e.is_published,
  };
}

export function toRow(f: ExerciseForm): Partial<ExerciseRow> {
  const translation = isTranslation(f.type);
  return {
    topic_id: f.topic_id,
    type: f.type,
    title: f.title.trim(),
    prompt: f.prompt.trim(),
    source_text: translation ? f.source_text.trim() : null,
    reference_answer: translation ? f.reference_answer.trim() || null : null,
    min_words: !translation && f.min_words !== '' ? Number(f.min_words) : null,
    max_words: !translation && f.max_words !== '' ? Number(f.max_words) : null,
    hints: { vocabulary: f.vocabulary, ...(f.starter.trim() && !translation ? { starter: f.starter.trim() } : {}) },
    is_published: f.is_published,
  };
}

function VocabularyInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const w = draft.trim();
    if (w && !value.includes(w)) onChange([...value, w]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };
  return (
    <div className="space-y-2">
      <TextField id="vocab" label="Từ vựng gợi ý" hint='Nhấn Enter để thêm. Có thể ghi nghĩa sau dấu hai chấm, ví dụ "floor: tầng".' value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={add} />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded-full bg-indigo-soft py-1 pr-1 pl-3 text-[14px] font-medium text-indigo-deep">
              {w}
              <button type="button" aria-label={`Bỏ ${w}`} onClick={() => onChange(value.filter((x) => x !== w))} className="rounded-full p-0.5 hover:bg-white">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExerciseFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const tree = useQuery({ queryKey: ['admin-tree'], queryFn: fetchAdminTree });
  const [form, setForm] = useState<ExerciseForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const allTopics = (tree.data ?? []).flatMap((l) => l.topics.map((t) => ({ ...t, level: l })));
  const existing = id ? allTopics.flatMap((t) => t.exercises).find((e) => e.id === id) : undefined;

  useEffect(() => {
    if (form || !tree.data) return;
    if (id) {
      if (existing) setForm(toForm(existing));
    } else {
      const topicId = params.get('topic') ?? '';
      const topic = allTopics.find((t) => t.id === topicId);
      const used = new Set(topic?.exercises.map((e) => e.type));
      const type = (['paragraph', 'translate_vi_en', 'translate_en_vi'] as const).find((t) => !used.has(t)) ?? 'paragraph';
      setForm({ ...EMPTY, topic_id: topicId, type, prompt: type === 'translate_vi_en' ? 'Dịch đoạn sau sang tiếng Anh.' : type === 'translate_en_vi' ? 'Dịch đoạn sau sang tiếng Việt.' : '' });
    }
  }, [tree.data, id, existing, form, params, allTopics]);

  if (tree.isLoading || (!form && !tree.error && (!id || existing))) return <PageSpinner />;
  if (tree.error) return <ErrorNote>Không tải được dữ liệu. {tree.error.message}</ErrorNote>;
  if (!form) return <ErrorNote>Không tìm thấy bài tập.</ErrorNote>;

  const set = <K extends keyof ExerciseForm>(k: K, v: ExerciseForm[K]) => {
    setForm({ ...form, [k]: v });
    setSaved(false);
  };
  const levelPosition = allTopics.find((t) => t.id === form.topic_id)?.level.position ?? 1;
  const translation = isTranslation(form.type);

  async function save(e: FormEvent) {
    e.preventDefault();
    const errs = validateExerciseForm(form!);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setSaveError(null);
    try {
      const topic = allTopics.find((t) => t.id === form!.topic_id);
      const position = existing && existing.topic_id === form!.topic_id
        ? existing.position
        : (topic?.exercises.length ? Math.max(...topic.exercises.map((x) => x.position)) + 1 : 1);
      const row = await upsertExercise({ ...toRow(form!), id, position });
      await qc.invalidateQueries({ queryKey: ['admin-tree'] });
      await qc.invalidateQueries({ queryKey: ['curriculum'] });
      await qc.invalidateQueries({ queryKey: ['exercise', row.id] });
      setSaved(true);
      if (!id) navigate(`/admin/exercises/${row.id}`, { replace: true });
    } catch (err) {
      setSaveError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/admin" className="inline-flex items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={18} aria-hidden /> Quản trị
      </Link>
      <h1 className="mt-4 mb-6 text-[28px]">{id ? 'Sửa bài tập' : 'Thêm bài tập'}</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="p-5">
          <form onSubmit={save} className="space-y-4" noValidate>
            {saveError && <ErrorNote>{saveError}</ErrorNote>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="topic" className="block text-[15px] font-semibold">Chủ đề</label>
                <select id="topic" value={form.topic_id} onChange={(e) => set('topic_id', e.target.value)} className="h-12 w-full rounded-xl border-2 border-line bg-surface px-3 focus:border-indigo focus:outline-none">
                  <option value="">Chọn chủ đề</option>
                  {allTopics.map((t) => (
                    <option key={t.id} value={t.id}>Cấp {t.level.position}: {t.title}</option>
                  ))}
                </select>
                {errors.topic_id && <p className="text-[13px] font-medium text-bad">{errors.topic_id}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="type" className="block text-[15px] font-semibold">Loại bài</label>
                <select id="type" value={form.type} onChange={(e) => set('type', e.target.value as ExerciseType)} className="h-12 w-full rounded-xl border-2 border-line bg-surface px-3 focus:border-indigo focus:outline-none">
                  <option value="paragraph">Viết đoạn văn</option>
                  <option value="translate_vi_en">Dịch Việt → Anh</option>
                  <option value="translate_en_vi">Dịch Anh → Việt</option>
                </select>
              </div>
            </div>

            <TextField id="title" label="Tên bài" value={form.title} error={errors.title} onChange={(e) => set('title', e.target.value)} />
            <TextAreaField id="prompt" label="Đề bài" value={form.prompt} error={errors.prompt} onChange={(e) => set('prompt', e.target.value)} />

            {translation ? (
              <>
                <TextAreaField id="source" label="Văn bản cần dịch" value={form.source_text} error={errors.source_text} onChange={(e) => set('source_text', e.target.value)} />
                <TextAreaField id="reference" label="Đáp án tham khảo" hint="Giúp AI hiểu ý cần đạt. Học viên không cần viết trùng từng chữ." value={form.reference_answer} onChange={(e) => set('reference_answer', e.target.value)} />
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <TextField id="min-words" label="Số từ tối thiểu" inputMode="numeric" value={form.min_words} error={errors.min_words} onChange={(e) => set('min_words', e.target.value.replace(/\D/g, ''))} />
                  <TextField id="max-words" label="Số từ tối đa" inputMode="numeric" value={form.max_words} onChange={(e) => set('max_words', e.target.value.replace(/\D/g, ''))} />
                </div>
                <TextField id="starter" label="Câu mở đầu gợi ý" value={form.starter} onChange={(e) => set('starter', e.target.value)} />
              </>
            )}

            <VocabularyInput value={form.vocabulary} onChange={(v) => set('vocabulary', v)} />

            <label className="flex items-center gap-3 font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-indigo)]" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
              Xuất bản (học viên nhìn thấy bài này)
            </label>

            <div className="flex items-center gap-3">
              <Button type="submit" size="lg" loading={busy}>Lưu bài tập</Button>
              {saved && <span className="font-semibold text-good">Đã lưu.</span>}
            </div>
          </form>
        </Card>

        <TestGradePanel
          exercise={{
            type: form.type,
            title: form.title,
            prompt: form.prompt,
            source_text: translation ? form.source_text : null,
            hints: { vocabulary: form.vocabulary },
            min_words: toRow(form).min_words ?? null,
            max_words: toRow(form).max_words ?? null,
            reference_answer: translation ? form.reference_answer || null : null,
            level_position: levelPosition,
          }}
        />
      </div>
    </div>
  );
}
