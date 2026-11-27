import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { Button, Chip, ErrorNote, PageSpinner, TextField, cx } from '@/components/ui';
import { TYPE_LABEL, TYPE_TONE } from '@/features/curriculum/api';
import { deleteRow, fetchAdminTree, swapPositions, upsertLevel, upsertTopic, upsertExercise, type AdminTable } from './api';

function IconButton({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx('flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-indigo-soft hover:text-ink', danger && 'hover:bg-bad-soft hover:text-bad')}
    >
      {children}
    </button>
  );
}

interface EditTarget {
  table: 'levels' | 'topics';
  id?: string;
  parentId?: string;
  position: number;
  title: string;
  description: string;
  icon: string;
}

function NodeEditor({ target, onCancel, onSaved }: { target: EditTarget; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(target);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Hãy nhập tên.');
      return;
    }
    setBusy(true);
    try {
      const common = { id: form.id, position: form.position, title: form.title.trim(), description: form.description.trim() || null };
      if (form.table === 'levels') await upsertLevel(common);
      else await upsertTopic({ ...common, level_id: form.parentId, icon: form.icon.trim() || null });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border-2 border-indigo/40 bg-surface p-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <TextField id={`${form.table}-title`} label={form.table === 'levels' ? 'Tên cấp độ' : 'Tên chủ đề'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        {form.table === 'topics' && <TextField id="topic-icon" label="Biểu tượng" value={form.icon} maxLength={8} onChange={(e) => setForm({ ...form, icon: e.target.value })} />}
      </div>
      <TextField id={`${form.table}-desc`} label="Mô tả ngắn" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>Lưu</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  );
}

export function AdminPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admin-tree'], queryFn: fetchAdminTree });
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-tree'] });
    await qc.invalidateQueries({ queryKey: ['curriculum'] });
  };

  async function run(action: () => Promise<unknown>) {
    setNotice(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setNotice((err as Error).message);
    }
  }

  async function remove(table: AdminTable, id: string, title: string) {
    if (!window.confirm(`Xóa "${title}"? Thao tác này không hoàn tác được.`)) return;
    setNotice(null);
    const res = await deleteRow(table, id);
    if (!res.ok) setNotice(res.message_vi);
    else await refresh();
  }

  if (isLoading) return <PageSpinner />;
  if (error || !data) return <ErrorNote>Không tải được dữ liệu. {error?.message}</ErrorNote>;

  const nextPos = (items: { position: number }[]) => (items.length ? Math.max(...items.map((i) => i.position)) + 1 : 1);
  const editorFor = (table: EditTarget['table'], id?: string) => editing && editing.table === table && editing.id === id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px]">Quản trị bài học</h1>
          <p className="text-muted">Bài bị tắt "Xuất bản" sẽ ẩn với học viên. Học viên không bao giờ bị khóa lại phần đã mở.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/settings" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-semibold text-indigo hover:bg-indigo-soft">
            <Settings size={18} aria-hidden /> Cài đặt
          </Link>
          <Button onClick={() => setEditing({ table: 'levels', position: nextPos(data), title: '', description: '', icon: '' })}>
            <Plus size={18} aria-hidden /> Thêm cấp độ
          </Button>
        </div>
      </div>

      {notice && <ErrorNote>{notice}</ErrorNote>}
      {editorFor('levels', undefined) && <NodeEditor target={editing!} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />}

      {data.map((level, li) => (
        <section key={level.id} className={cx('rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-tactile)]', !level.is_published && 'opacity-70')}>
          {editorFor('levels', level.id) ? (
            <NodeEditor target={editing!} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo font-extrabold text-white">{level.position}</span>
              <h2 className="flex-1 text-[19px]">{level.title}</h2>
              {!level.is_published && <Chip tone="gray">Đang ẩn</Chip>}
              <IconButton label={level.is_published ? `Ẩn ${level.title}` : `Xuất bản ${level.title}`} onClick={() => run(() => upsertLevel({ id: level.id, is_published: !level.is_published }))}>
                {level.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
              </IconButton>
              <IconButton label={`Lên ${level.title}`} onClick={() => li > 0 && run(() => swapPositions('levels', level, data[li - 1]))}><ArrowUp size={18} /></IconButton>
              <IconButton label={`Xuống ${level.title}`} onClick={() => li < data.length - 1 && run(() => swapPositions('levels', level, data[li + 1]))}><ArrowDown size={18} /></IconButton>
              <IconButton label={`Sửa ${level.title}`} onClick={() => setEditing({ table: 'levels', id: level.id, position: level.position, title: level.title, description: level.description ?? '', icon: '' })}><Pencil size={18} /></IconButton>
              <IconButton danger label={`Xóa ${level.title}`} onClick={() => remove('levels', level.id, level.title)}><Trash2 size={18} /></IconButton>
            </div>
          )}

          <div className="mt-4 space-y-4 sm:pl-11">
            {level.topics.map((topic, ti) => (
              <div key={topic.id} className={cx('rounded-xl bg-mist p-3', !topic.is_published && 'opacity-70')}>
                {editorFor('topics', topic.id) ? (
                  <NodeEditor target={editing!} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[22px]" aria-hidden>{topic.icon ?? '📝'}</span>
                    <h3 className="flex-1 text-[16px]">{topic.title}</h3>
                    {!topic.is_published && <Chip tone="gray">Đang ẩn</Chip>}
                    <IconButton label={topic.is_published ? `Ẩn ${topic.title}` : `Xuất bản ${topic.title}`} onClick={() => run(() => upsertTopic({ id: topic.id, is_published: !topic.is_published }))}>
                      {topic.is_published ? <Eye size={18} /> : <EyeOff size={18} />}
                    </IconButton>
                    <IconButton label={`Lên ${topic.title}`} onClick={() => ti > 0 && run(() => swapPositions('topics', topic, level.topics[ti - 1]))}><ArrowUp size={18} /></IconButton>
                    <IconButton label={`Xuống ${topic.title}`} onClick={() => ti < level.topics.length - 1 && run(() => swapPositions('topics', topic, level.topics[ti + 1]))}><ArrowDown size={18} /></IconButton>
                    <IconButton label={`Sửa ${topic.title}`} onClick={() => setEditing({ table: 'topics', id: topic.id, parentId: level.id, position: topic.position, title: topic.title, description: topic.description ?? '', icon: topic.icon ?? '' })}><Pencil size={18} /></IconButton>
                    <IconButton danger label={`Xóa ${topic.title}`} onClick={() => remove('topics', topic.id, topic.title)}><Trash2 size={18} /></IconButton>
                  </div>
                )}

                <ul className="mt-2 space-y-1.5">
                  {topic.exercises.map((ex, ei) => (
                    <li key={ex.id} className={cx('flex flex-wrap items-center gap-2 rounded-lg bg-surface px-3 py-2', !ex.is_published && 'opacity-60')}>
                      <Chip tone={TYPE_TONE[ex.type]}>{TYPE_LABEL[ex.type]}</Chip>
                      <Link to={`/admin/exercises/${ex.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-indigo">{ex.title}</Link>
                      {!ex.is_published && <Chip tone="gray">Đang ẩn</Chip>}
                      <IconButton label={ex.is_published ? `Ẩn ${ex.title}` : `Xuất bản ${ex.title}`} onClick={() => run(() => upsertExercise({ id: ex.id, is_published: !ex.is_published }))}>
                        {ex.is_published ? <Eye size={17} /> : <EyeOff size={17} />}
                      </IconButton>
                      <IconButton label={`Lên ${ex.title}`} onClick={() => ei > 0 && run(() => swapPositions('exercises', ex, topic.exercises[ei - 1]))}><ArrowUp size={17} /></IconButton>
                      <IconButton label={`Xuống ${ex.title}`} onClick={() => ei < topic.exercises.length - 1 && run(() => swapPositions('exercises', ex, topic.exercises[ei + 1]))}><ArrowDown size={17} /></IconButton>
                      <IconButton danger label={`Xóa ${ex.title}`} onClick={() => remove('exercises', ex.id, ex.title)}><Trash2 size={17} /></IconButton>
                    </li>
                  ))}
                </ul>
                <Link to={`/admin/exercises/new?topic=${topic.id}`} className="mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] font-semibold text-indigo hover:bg-indigo-soft">
                  <Plus size={16} aria-hidden /> Thêm bài tập
                </Link>
              </div>
            ))}

            {editing && editing.table === 'topics' && !editing.id && editing.parentId === level.id ? (
              <NodeEditor target={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />
            ) : (
              <button
                type="button"
                onClick={() => setEditing({ table: 'topics', parentId: level.id, position: nextPos(level.topics), title: '', description: '', icon: '' })}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] font-semibold text-indigo hover:bg-indigo-soft"
              >
                <Plus size={16} aria-hidden /> Thêm chủ đề
              </button>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
