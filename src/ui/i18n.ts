/**
 * Traducción de la interfaz. El texto vive aquí en lugar de en el HTML para que
 * cambiar de idioma no requiera recargar la página.
 */

export type Locale = 'es' | 'en';

export const LOCALES: readonly Locale[] = ['es', 'en'];

export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  es: 'Español',
  en: 'English',
};

/** Claves de texto. Todas deben existir en todos los idiomas. */
const es = {
  'app.tagline': 'Bloques que caen · reglas modernas (SRS, hold, T-spins)',
  'app.legal': 'Proyecto educativo de código abierto, no afiliado a The Tetris Company.',
  'menu.play': 'Jugar',
  'menu.settings': 'Ajustes',
  'menu.records': 'Récords',
  'menu.help': 'Cómo jugar',
  'menu.back': 'Volver',
  'menu.done': 'Listo',
  'modes.title': 'Elige modo',
  'modes.start': 'Empezar',
  'modes.startLevel': 'Nivel inicial',
  'modes.endless': 'Sin fin (Marathon)',
  'modes.marathon.desc': '150 líneas, la velocidad sube con el nivel. Opción sin fin.',
  'modes.sprint.desc': 'Limpia 40 líneas lo más rápido posible.',
  'modes.ultra.desc': 'Máxima puntuación en 2 minutos.',
  'modes.zen.desc': 'Sin fin y sin prisa: gravedad fija.',
  'modes.daily.desc': 'El mismo reto de 40 líneas para todos cada día.',
  'modes.practice.desc': 'Sin prisa y sin fin, para entrenar T-spins y perfect clears.',
  'modes.marathon': 'Marathon',
  'modes.sprint': 'Sprint 40L',
  'modes.ultra': 'Ultra 2:00',
  'modes.zen': 'Zen',
  'modes.daily': 'Reto diario',
  'modes.practice': 'Práctica',
  'daily.today': 'Reto del {d}',
  'hud.score': 'PUNTOS',
  'hud.level': 'NIVEL',
  'hud.lines': 'LÍNEAS',
  'hud.time': 'TIEMPO',
  'hud.hold': 'HOLD',
  'hud.next': 'NEXT',
  'hud.goalLines': 'Objetivo: {n} líneas',
  'hud.goalTime': 'Tiempo: {t}',
  'hud.goalNone': 'Sin fin',
  'pause.title': 'Pausa',
  'pause.resume': 'Continuar',
  'pause.restart': 'Reiniciar',
  'pause.quit': 'Salir al menú',
  'results.gameover': 'Fin de la partida',
  'results.finished': '¡Objetivo cumplido!',
  'results.retry': 'Otra vez',
  'results.menu': 'Menú',
  'results.watchReplay': 'Ver repetición',
  'results.download': 'Descargar',
  'results.replaySaved': 'Repetición guardada.',
  'results.newRecord': '¡Nuevo récord!',
  'results.rank': 'Puesto {n} en tus récords',
  'results.mode': 'Modo',
  'results.pieces': 'Piezas / s',
  'results.tetrisRate': 'Tetris rate',
  'results.tspins': 'T-spins',
  'results.maxCombo': 'Combo máx.',
  'results.maxB2b': 'B2B máx.',
  'results.perfectClears': 'Perfect clears',
  'results.finesse': 'Finesse',
  'results.finesseValue': '{p} % · {n} teclas de más',
  'results.noData': 'sin datos',
  'records.title': 'Récords',
  'records.openReplay': 'Abrir repetición',
  'records.empty': 'Sin partidas todavía',
  'records.time': 'Tiempo',
  'records.points': 'Puntos',
  'records.lines': 'Líneas',
  'records.level': 'Nivel',
  'records.date': 'Fecha',
  'help.title': 'Cómo jugar',
  'help.body':
    'Completa filas para eliminarlas. Un Tetris son 4 filas a la vez. Gira la T en un hueco para hacer un T-spin. Encadena acciones difíciles para el bono back-to-back.',
  'help.touch':
    'Móvil: desliza para mover, toca para rotar (mitad izquierda = antihorario), desliza rápido hacia abajo para hard drop, arrastra hacia abajo para soft drop y hacia arriba para hold.',
  'help.move': 'Mover',
  'help.rotate': 'Rotar',
  'help.drops': 'Soft drop / Hard drop',
  'help.hold': 'Hold',
  'help.system': 'Pausa / Reiniciar / Silencio',
  'notice.replayPlaying': 'Reproduciendo una partida guardada.',
  'notice.replayInvalid': 'Ese archivo no es una repetición válida.',
  'notice.no3d': 'El modo 3D no está disponible en este dispositivo; se usa el modo clásico.',
  'settings.palette.neon': 'Neón (por defecto)',
  'settings.palette.accessible': 'Daltonismo (Okabe-Ito, la más distinguible)',
  'settings.palette.highContrast': 'Alto contraste (fondo negro, colores vivos)',
  'tip.hold': 'Puedes guardar la pieza actual para más tarde con la tecla de reserva.',
  'tip.hardDrop': 'La caída rápida deja la pieza abajo al instante y suma puntos por cada fila.',
  'tip.tspin':
    'Acabas de girar la T dentro de un hueco. Esa jugada puntúa mucho más que una limpieza normal.',
  'tip.backToBack':
    'Dos jugadas difíciles seguidas: la segunda vale una vez y media. Sigue encadenando.',
  'tip.combo': 'Limpiar líneas en piezas consecutivas suma un extra que crece con cada una.',
  'tip.danger': 'La pila está subiendo. Limpia por abajo antes de que te alcance.',
  'tip.perfectClear':
    'Has dejado el tablero vacío. Eso es un perfect clear y da la mayor bonificación del juego.',
  'settings.tips': 'Consejos mientras juegas',
  'countdown.go': '¡YA!',
  'action.single': 'SINGLE',
  'action.double': 'DOUBLE',
  'action.triple': 'TRIPLE',
  'action.tetris': 'TETRIS',
  'action.tspin': 'T-SPIN',
  'action.tspinMini': 'MINI T-SPIN',
  'action.b2b': 'BACK-TO-BACK',
  'action.combo': 'COMBO ×{n}',
  'action.perfectClear': 'PERFECT CLEAR',
  'action.level': 'NIVEL {n}',
  'a11y.board': 'Tablero de juego',
  'a11y.board3d': 'Tablero de juego en tres dimensiones',
  'a11y.points': '{action}, {n} puntos',
  'a11y.levelUp': 'Nivel {n}',
  'a11y.gameOver': 'Fin de la partida',
  'a11y.finished': 'Objetivo completado',
} as const;

export type MessageKey = keyof typeof es;

const en: Record<MessageKey, string> = {
  'app.tagline': 'Falling blocks · modern rules (SRS, hold, T-spins)',
  'app.legal': 'Open-source educational project, not affiliated with The Tetris Company.',
  'menu.play': 'Play',
  'menu.settings': 'Settings',
  'menu.records': 'Records',
  'menu.help': 'How to play',
  'menu.back': 'Back',
  'menu.done': 'Done',
  'modes.title': 'Choose a mode',
  'modes.start': 'Start',
  'modes.startLevel': 'Starting level',
  'modes.endless': 'Endless (Marathon)',
  'modes.marathon.desc': '150 lines, speed rises with the level. Endless option.',
  'modes.sprint.desc': 'Clear 40 lines as fast as you can.',
  'modes.ultra.desc': 'Highest score in 2 minutes.',
  'modes.zen.desc': 'No end and no rush: fixed gravity.',
  'modes.daily.desc': 'The same 40-line challenge for everyone each day.',
  'modes.practice.desc': 'No rush and no end, to train T-spins and perfect clears.',
  'modes.marathon': 'Marathon',
  'modes.sprint': 'Sprint 40L',
  'modes.ultra': 'Ultra 2:00',
  'modes.zen': 'Zen',
  'modes.daily': 'Daily challenge',
  'modes.practice': 'Practice',
  'daily.today': 'Challenge of {d}',
  'hud.score': 'SCORE',
  'hud.level': 'LEVEL',
  'hud.lines': 'LINES',
  'hud.time': 'TIME',
  'hud.hold': 'HOLD',
  'hud.next': 'NEXT',
  'hud.goalLines': 'Goal: {n} lines',
  'hud.goalTime': 'Time: {t}',
  'hud.goalNone': 'Endless',
  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Restart',
  'pause.quit': 'Quit to menu',
  'results.gameover': 'Game over',
  'results.finished': 'Goal complete!',
  'results.retry': 'Play again',
  'results.menu': 'Menu',
  'results.watchReplay': 'Watch replay',
  'results.download': 'Download',
  'results.replaySaved': 'Replay saved.',
  'results.newRecord': 'New record!',
  'results.rank': 'Rank {n} in your records',
  'results.mode': 'Mode',
  'results.pieces': 'Pieces / s',
  'results.tetrisRate': 'Tetris rate',
  'results.tspins': 'T-spins',
  'results.maxCombo': 'Max combo',
  'results.maxB2b': 'Max B2B',
  'results.perfectClears': 'Perfect clears',
  'results.finesse': 'Finesse',
  'results.finesseValue': '{p} % · {n} extra keys',
  'results.noData': 'no data',
  'records.title': 'Records',
  'records.openReplay': 'Open replay',
  'records.empty': 'No games yet',
  'records.time': 'Time',
  'records.points': 'Score',
  'records.lines': 'Lines',
  'records.level': 'Level',
  'records.date': 'Date',
  'help.title': 'How to play',
  'help.body':
    'Complete rows to clear them. A Tetris is 4 rows at once. Twist the T into a gap for a T-spin. Chain difficult clears for the back-to-back bonus.',
  'help.touch':
    'Mobile: swipe to move, tap to rotate (left half = counter-clockwise), flick down for hard drop, drag down for soft drop and up for hold.',
  'help.move': 'Move',
  'help.rotate': 'Rotate',
  'help.drops': 'Soft drop / Hard drop',
  'help.hold': 'Hold',
  'help.system': 'Pause / Restart / Mute',
  'notice.replayPlaying': 'Playing a saved game.',
  'notice.replayInvalid': 'That file is not a valid replay.',
  'notice.no3d': '3D mode is not available on this device; the classic mode is used instead.',
  'settings.palette.neon': 'Neon (default)',
  'settings.palette.accessible': 'Colour blindness (Okabe-Ito, most distinguishable)',
  'settings.palette.highContrast': 'High contrast (black background, vivid colours)',
  'tip.hold': 'You can save the current piece for later with the hold key.',
  'tip.hardDrop': 'A hard drop sends the piece straight down and scores points for every row.',
  'tip.tspin': 'You just twisted the T into a gap. That scores far more than a plain clear.',
  'tip.backToBack':
    'Two difficult clears in a row: the second is worth one and a half times as much. Keep the chain going.',
  'tip.combo': 'Clearing lines on consecutive pieces adds a bonus that grows each time.',
  'tip.danger': 'The stack is rising. Clear from the bottom before it reaches the top.',
  'tip.perfectClear':
    'You emptied the board. That is a perfect clear, the biggest bonus in the game.',
  'settings.tips': 'Tips while you play',
  'countdown.go': 'GO!',
  'action.single': 'SINGLE',
  'action.double': 'DOUBLE',
  'action.triple': 'TRIPLE',
  'action.tetris': 'TETRIS',
  'action.tspin': 'T-SPIN',
  'action.tspinMini': 'MINI T-SPIN',
  'action.b2b': 'BACK-TO-BACK',
  'action.combo': 'COMBO ×{n}',
  'action.perfectClear': 'PERFECT CLEAR',
  'action.level': 'LEVEL {n}',
  'a11y.board': 'Game board',
  'a11y.board3d': 'Game board in three dimensions',
  'a11y.points': '{action}, {n} points',
  'a11y.levelUp': 'Level {n}',
  'a11y.gameOver': 'Game over',
  'a11y.finished': 'Goal complete',
};

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { es, en };

let current: Locale = 'es';

/** Idioma preferido del navegador, si lo tenemos traducido. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'es';
  const tags = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
  for (const tag of tags) {
    const base = tag.slice(0, 2).toLowerCase();
    if (LOCALES.includes(base as Locale)) return base as Locale;
  }
  return 'es';
}

export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Texto traducido, con sustitución de marcadores `{clave}`. */
export function t(key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = MESSAGES[current][key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Traduce todos los elementos marcados con `data-i18n` en el documento.
 * Con `data-i18n-attr` se traduce ese atributo en vez del contenido.
 */
export function applyTranslations(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.dataset.i18n as MessageKey | undefined;
    if (!key) continue;
    const attr = el.dataset.i18nAttr;
    if (attr) el.setAttribute(attr, t(key));
    else el.textContent = t(key);
  }
}
