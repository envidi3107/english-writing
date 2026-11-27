export const MAX_ANSWER_CHARS = 1500;

/** Counts words; tokens made only of punctuation/symbols are ignored. */
export function countWords(text: string): number {
  return text
    .normalize('NFC')
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export function validateAnswer(text: string): { ok: true; text: string } | { ok: false; message_vi: string } {
  const trimmed = text.normalize('NFC').trim();
  if (!trimmed) return { ok: false, message_vi: 'Bạn chưa viết gì cả.' };
  if (trimmed.length > MAX_ANSWER_CHARS) {
    return { ok: false, message_vi: `Bài viết quá dài (tối đa ${MAX_ANSWER_CHARS} ký tự).` };
  }
  return { ok: true, text: trimmed };
}
