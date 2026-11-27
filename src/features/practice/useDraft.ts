import { useCallback, useState } from 'react';

const key = (id: string) => `draft:${id}`;

function read(id: string): string {
  try {
    return localStorage.getItem(key(id)) ?? '';
  } catch {
    return '';
  }
}

/** Answer text persisted per exercise in localStorage, so a failed submit or reload never loses it. */
export function useDraft(exerciseId: string): [string, (v: string) => void, () => void] {
  const [value, setValue] = useState(() => read(exerciseId));
  const [forId, setForId] = useState(exerciseId);
  if (forId !== exerciseId) {
    setForId(exerciseId);
    setValue(read(exerciseId));
  }

  const update = useCallback(
    (v: string) => {
      setValue(v);
      try {
        if (v) localStorage.setItem(key(exerciseId), v);
        else localStorage.removeItem(key(exerciseId));
      } catch {
        /* storage unavailable: keep in memory only */
      }
    },
    [exerciseId],
  );

  const clear = useCallback(() => {
    setValue('');
    try {
      localStorage.removeItem(key(exerciseId));
    } catch {
      /* ignore */
    }
  }, [exerciseId]);

  return [value, update, clear];
}
