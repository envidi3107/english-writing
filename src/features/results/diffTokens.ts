import { diffWordsWithSpace } from 'diff';

export type DiffToken = { kind: 'same' | 'removed' | 'added'; text: string };

/**
 * Word-level diff between the learner's answer and the corrected text.
 * Whitespace inside removed runs is dropped and whitespace inside added runs is
 * kept as 'same', so joining every non-removed token yields the corrected text.
 */
export function diffTokens(original: string, corrected: string): DiffToken[] {
  const out: DiffToken[] = [];
  const push = (kind: DiffToken['kind'], text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };

  for (const change of diffWordsWithSpace(original.normalize('NFC'), corrected.normalize('NFC'))) {
    if (!change.added && !change.removed) {
      push('same', change.value);
      continue;
    }
    for (const part of change.value.split(/(\s+)/)) {
      if (!part) continue;
      const isSpace = /^\s+$/.test(part);
      if (change.removed) {
        if (!isSpace) push('removed', part);
      } else {
        push(isSpace ? 'same' : 'added', part);
      }
    }
  }
  return out;
}
