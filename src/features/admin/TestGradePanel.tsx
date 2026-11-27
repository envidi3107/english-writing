import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ExerciseForGrading } from '@shared/types.ts';
import { validateAnswer } from '@shared/text.ts';
import { Button, Card, ErrorNote, TextAreaField } from '@/components/ui';
import { gradeSubmission, type GradeResponse } from '@/features/practice/api';
import { CriteriaBars, ErrorCard, InlineDiff } from '@/features/results/parts';
import { Stars } from '@/components/ui';

/** Lets an admin see how the AI grades this exercise (unsaved form data included) without recording anything. */
export function TestGradePanel({ exercise }: { exercise: ExerciseForGrading }) {
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer: string; out: GradeResponse } | null>(null);
  const qc = useQueryClient();

  async function run() {
    const checked = validateAnswer(answer);
    if (!checked.ok || !exercise.prompt.trim()) return;
    setBusy(true);
    const out = await gradeSubmission({ dry_run: true, exercise, answer: checked.text });
    setRes({ answer: checked.text, out });
    setBusy(false);
    void qc.invalidateQueries({ queryKey: ['usage'] });
  }

  return (
    <Card className="h-fit space-y-4 p-5">
      <div>
        <h2 className="text-[18px]">Thử chấm</h2>
        <p className="text-[14px] text-muted">Viết thử một bài để xem AI chấm đề này thế nào. Không lưu điểm, có tính vào mức dùng AI.</p>
      </div>
      <TextAreaField id="test-answer" label="Bài làm thử" value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <Button variant="secondary" onClick={run} loading={busy} disabled={!validateAnswer(answer).ok || !exercise.prompt.trim()}>
        Thử chấm
      </Button>

      {res && !res.out.ok && <ErrorNote>{res.out.message_vi}</ErrorNote>}
      {res && res.out.ok && res.out.kind === 'rejected' && (
        <div className="rounded-xl bg-warn-soft px-4 py-3 text-[#7a4b06]">{res.out.reason_vi}</div>
      )}
      {res && res.out.ok && res.out.kind === 'graded' && (
        <div className="space-y-4 border-t border-line pt-4">
          <Stars value={res.out.stars} size={22} />
          <InlineDiff original={res.answer} corrected={res.out.result.corrected_text} />
          <CriteriaBars criteria={res.out.result.criteria} overall={res.out.result.overall_score} />
          <p className="text-[15px]">{res.out.result.general_feedback_vi}</p>
          <ul className="space-y-2" aria-label="Lỗi tìm thấy">
            {res.out.result.errors.map((e, i) => (
              <ErrorCard key={i} error={e} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
