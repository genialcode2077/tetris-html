import { afterEach, describe, expect, it } from 'vitest';
import { LOCALES, getLocale, setLocale, t } from './i18n';

afterEach(() => {
  setLocale('es');
});

describe('traducción', () => {
  it('devuelve el texto del idioma activo', () => {
    setLocale('es');
    expect(t('menu.play')).toBe('Jugar');
    setLocale('en');
    expect(t('menu.play')).toBe('Play');
    expect(getLocale()).toBe('en');
  });

  it('sustituye los marcadores', () => {
    setLocale('es');
    expect(t('hud.goalLines', { n: 40 })).toBe('Objetivo: 40 líneas');
    expect(t('action.combo', { n: 3 })).toBe('COMBO ×3');
    setLocale('en');
    expect(t('hud.goalLines', { n: 40 })).toBe('Goal: 40 lines');
  });

  it('deja el marcador si falta el valor', () => {
    expect(t('hud.goalLines')).toContain('{n}');
  });

  it('todos los idiomas tienen las mismas claves y ninguna vacía', () => {
    const keys = new Set<string>();
    for (const locale of LOCALES) {
      setLocale(locale);
      // Se recorre un conjunto representativo de claves de cada zona de la interfaz.
      for (const key of [
        'menu.play',
        'modes.title',
        'hud.score',
        'pause.title',
        'results.gameover',
        'records.title',
        'help.title',
        'action.tetris',
        'a11y.board',
      ] as const) {
        const value = t(key);
        expect(value, `${locale}/${key}`).not.toBe('');
        keys.add(key);
      }
    }
    expect(keys.size).toBe(9);
  });
});
