import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import { STORAGE_KEY, Store, mergeDefaults, type StorageLike } from './store';

function memoryStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('Store', () => {
  it('usa valores por defecto sin almacenamiento o con JSON corrupto', () => {
    expect(new Store(null).settings).toEqual(DEFAULT_SETTINGS);
    const s = new Store(memoryStorage({ [STORAGE_KEY]: '{not json' }));
    expect(s.settings.handling.dasMs).toBe(167);
  });

  it('persiste y recarga ajustes y keymap ignorando claves desconocidas', () => {
    const mem = memoryStorage();
    const a = new Store(mem);
    a.updateSettings((s) => {
      s.handling.arrMs = 0;
      s.video.palette = 'accessible';
    });
    a.setKeymap({ ...a.keymap, hold: ['KeyV'] });
    mem.data[STORAGE_KEY] = mem.data[STORAGE_KEY]!.replace('"version":1', '"version":1,"junk":5');
    const b = new Store(mem);
    expect(b.settings.handling.arrMs).toBe(0);
    expect(b.settings.video.palette).toBe('accessible');
    expect(b.settings.audio.master).toBe(0.8);
    expect(b.keymap.hold).toEqual(['KeyV']);
  });

  it('ordena récords por puntuación (o tiempo en sprint) y limita a 10', () => {
    const s = new Store(memoryStorage());
    for (let i = 0; i < 12; i++) {
      s.addHighScore('marathon', {
        score: i * 100,
        lines: i,
        level: 1,
        timeMs: 1000,
        pps: 1,
        date: 'd',
      });
    }
    expect(s.highscores('marathon')).toHaveLength(10);
    expect(s.highscores('marathon')[0]?.score).toBe(1100);
    expect(
      s.addHighScore('sprint', {
        score: 0,
        lines: 40,
        level: 1,
        timeMs: 90_000,
        pps: 2,
        date: 'd',
      }),
    ).toBe(1);
    expect(
      s.addHighScore('sprint', {
        score: 0,
        lines: 40,
        level: 1,
        timeMs: 60_000,
        pps: 2,
        date: 'd',
      }),
    ).toBe(1);
    expect(s.highscores('sprint')[1]?.timeMs).toBe(90_000);
  });

  it('mergeDefaults respeta tipos', () => {
    expect(mergeDefaults({ a: 1, b: { c: true } }, { a: 'x', b: { c: false, d: 1 } })).toEqual({
      a: 1,
      b: { c: false },
    });
  });
});
