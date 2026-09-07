import type { InputAction } from '@/game/handling';

/** Mapa acción → códigos de tecla (`KeyboardEvent.code`). */
export type KeyMap = Record<InputAction, string[]>;

/** Guideline por defecto (docs/research/01 §Guideline "Controller mappings"). */
export const DEFAULT_KEYMAP: KeyMap = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  softDrop: ['ArrowDown'],
  hardDrop: ['Space'],
  cw: ['ArrowUp', 'KeyX'],
  ccw: ['KeyZ', 'ControlLeft', 'ControlRight'],
  r180: ['KeyA'],
  hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  mute: ['KeyM'],
};

export const ACTION_LABELS: Readonly<Record<InputAction, string>> = {
  left: 'Mover izquierda',
  right: 'Mover derecha',
  softDrop: 'Soft drop',
  hardDrop: 'Hard drop',
  cw: 'Rotar horario',
  ccw: 'Rotar antihorario',
  r180: 'Rotar 180°',
  hold: 'Hold',
  pause: 'Pausa',
  restart: 'Reiniciar',
  mute: 'Silenciar',
};

export function actionForCode(keymap: KeyMap, code: string): InputAction | null {
  for (const action of Object.keys(keymap) as InputAction[]) {
    if (keymap[action].includes(code)) return action;
  }
  return null;
}

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: 'Espacio',
    ShiftLeft: 'Shift izq',
    ShiftRight: 'Shift der',
    ControlLeft: 'Ctrl izq',
    ControlRight: 'Ctrl der',
    Escape: 'Esc',
    Enter: 'Intro',
  };
  return map[code] ?? code;
}
