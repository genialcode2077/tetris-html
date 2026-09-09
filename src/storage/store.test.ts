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
    removeItem: (k) => {
      Reflect.deleteProperty(data, k);
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

describe('Store: repeticiones', () => {
  const replay = (score: number, timeMs: number, finished: boolean) =>
    ({
      version: 1 as const,
      createdAt: '2026-09-07',
      appVersion: '0.1.0',
      mode: 'marathon' as const,
      seed: 1,
      rules: {} as never,
      handling: { dasMs: 167, arrMs: 33, dcdMs: 0 },
      inputs: [],
      result: { score, lines: 0, level: 1, timeMs, pieces: 0, finished },
    }) as never;

  it('guarda solo la mejor partida por puntuación', () => {
    const s = new Store(memoryStorage());
    expect(s.bestReplay('marathon')).toBeNull();
    expect(s.saveBestReplay('marathon', replay(1000, 60_000, false))).toBe(true);
    expect(s.saveBestReplay('marathon', replay(500, 30_000, false))).toBe(false);
    expect(s.saveBestReplay('marathon', replay(2000, 90_000, false))).toBe(true);
    expect(s.bestReplay('marathon')?.result.score).toBe(2000);
  });

  it('en sprint gana la partida terminada más rápida', () => {
    const s = new Store(memoryStorage());
    const sprint = (timeMs: number, finished: boolean) => ({
      ...(replay(0, timeMs, finished) as unknown as { mode: string }),
      mode: 'sprint',
    });
    expect(s.saveBestReplay('sprint', sprint(80_000, false) as never)).toBe(true);
    expect(s.saveBestReplay('sprint', sprint(60_000, true) as never)).toBe(true);
    expect(s.saveBestReplay('sprint', sprint(70_000, true) as never)).toBe(false);
    expect(s.bestReplay('sprint')?.result.timeMs).toBe(60_000);
  });

  it('los datos persistidos sobreviven a una recarga', () => {
    const mem = memoryStorage();
    const a = new Store(mem);
    a.saveBestReplay('ultra', replay(4321, 120_000, true));
    const b = new Store(mem);
    expect(b.bestReplay('ultra')?.result.score).toBe(4321);
    expect(b.bestReplay('marathon')).toBeNull();
  });
});
