import { test, type Page } from '@playwright/test';

/**
 * Genera capturas de verificación visual en docs/assets/screenshots (no son aserciones).
 * Ejecutar: pnpm test:e2e --grep @screenshots
 */
const OUT = 'docs/assets/screenshots';

async function press(page: Page, code: string, ticks = 60): Promise<void> {
  await page.keyboard.down(code);
  await page.evaluate((ms) => window.__blockfall?.tick(ms), 40);
  await page.keyboard.up(code);
  await page.evaluate((ms) => window.__blockfall?.tick(ms), ticks);
}

test('capturas de referencia @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.screenshot({ path: `${OUT}/${tag}-01-title.png` });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.screenshot({ path: `${OUT}/${tag}-02-modes.png` });
  // Partida determinista con semilla fija.
  await page.evaluate(() => {
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(2400));
  await page.screenshot({ path: `${OUT}/${tag}-03-countdown.png` });
  await page.evaluate(() => window.__blockfall?.tick(1300));
  // Unas cuantas piezas: mover a extremos y soltar para levantar pila
  const script: string[][] = [
    ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Space'],
    ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Space'],
    ['KeyC'],
    ['ArrowUp', 'ArrowLeft', 'ArrowLeft', 'Space'],
    ['KeyZ', 'ArrowRight', 'ArrowRight', 'Space'],
    ['ArrowDown', 'ArrowDown'],
  ];
  for (const seq of script) for (const code of seq) await press(page, code);
  await page.screenshot({ path: `${OUT}/${tag}-04-playing.png` });
  // Preparar una línea casi completa y limpiarla con una I vertical
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    if (!s) return;
    const b = s.game.state.board;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 9; x++) b[y * 10 + x] = 8;
    for (let y = 2; y < 4; y++) for (let x = 0; x < 9; x++) b[y * 10 + x] = ((x + y) % 7) + 1;
    b[3 * 10 + 4] = 0;
    b[2 * 10 + 7] = 0;
    (s.game.state as { active: unknown }).active = { type: 'I', rotation: 1, x: 7, y: 0 };
  });
  await press(page, 'Space', 90);
  await page.screenshot({ path: `${OUT}/${tag}-05-lineclear.png` });
  await page.evaluate(() => window.__blockfall?.tick(400));
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__blockfall?.tick(50));
  await page.screenshot({ path: `${OUT}/${tag}-06-pause.png` });
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.screenshot({ path: `${OUT}/${tag}-07-settings.png`, fullPage: false });
});

test('capturas del modo 3D @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.video.renderer = 'three';
    });
  });
  await page.reload();
  await page.waitForFunction(
    () =>
      (window.__blockfall?.app.rendererDiagnostics as { ready?: boolean } | undefined)?.ready ===
      true,
    undefined,
    { timeout: 20_000 },
  );
  await page.evaluate(() => {
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(4000));
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    if (!s) return;
    const b = s.game.state.board;
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 10; x++) if ((x + y * 3) % 4 !== 0) b[y * 10 + x] = ((x * 2 + y) % 7) + 1;
    }
  });
  await page.evaluate(() => window.__blockfall?.tick(200));
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${tag}-3d-playing.png` });
});

test('captura de un consejo en pantalla @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.coaching.enabled = true;
      s.locale = 'es';
    });
    window.__blockfall?.store.setSeenTips([]);
    window.__blockfall?.app.refreshSettings();
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));
  await page.evaluate(() => {
    const bf = window.__blockfall;
    const s = bf?.app.currentSession;
    if (!bf || !s) return;
    for (let i = 0; i < 16; i++) {
      const goLeft = i % 2 === 0;
      for (let n = 0; n < 4; n++) s.game.dispatch(goLeft ? 'left' : 'right');
      s.game.dispatch('softDropOn');
      bf.tick(1400);
      s.game.dispatch('softDropOff');
      bf.tick(700);
      if (i % 3 === 2) s.game.state.board.fill(0);
    }
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${tag}-08-tip.png` });
});

test('captura del modo práctica con basura @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.locale = 'es';
      s.game.mode = 'practice';
      s.game.garbageEveryPieces = 4;
      s.game.startLevel = 1;
    });
    window.__blockfall?.app.refreshSettings();
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));
  // Se colocan piezas para que suba basura varias veces.
  await page.evaluate(() => {
    const bf = window.__blockfall;
    const s = bf?.app.currentSession;
    if (!bf || !s) return;
    for (let i = 0; i < 14; i++) {
      const dir = i % 3 === 0 ? 'left' : i % 3 === 1 ? 'right' : 'cw';
      for (let n = 0; n < 3; n++) s.game.dispatch(dir);
      s.game.dispatch('hardDrop');
      bf.tick(120);
    }
  });
  await page.evaluate(() => window.__blockfall?.tick(200));
  await page.screenshot({ path: `${OUT}/${tag}-09-practice-garbage.png` });
});

test('captura de la comparación con el récord @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  // Se deja un récord previo con parciales para tener con qué comparar.
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.locale = 'es';
      s.game.mode = 'sprint';
    });
    window.__blockfall?.store.addHighScore('sprint', {
      score: 0,
      lines: 40,
      level: 1,
      timeMs: 60_000,
      pps: 2,
      date: '2026-09-01',
      splits: [20_000, 35_000, 48_000, 60_000],
    });
    window.__blockfall?.app.refreshSettings();
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));
  // Se cruza el primer hito antes que el récord, así que la diferencia es favorable.
  await page.evaluate(() => {
    const bf = window.__blockfall;
    const s = bf?.app.currentSession;
    if (!bf || !s) return;
    (s.game.state as { lines: number }).lines = 10;
    bf.tick(60);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${tag}-10-split.png` });
});

test('captura de los controles de la repetición @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.locale = 'es';
    });
    window.__blockfall?.app.refreshSettings();
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));
  // Se juegan unas piezas y se termina la partida para poder ver la repetición.
  await page.evaluate(() => {
    const bf = window.__blockfall;
    const s = bf?.app.currentSession;
    if (!bf || !s) return;
    for (let i = 0; i < 6; i++) {
      s.press('hardDrop');
      s.release('hardDrop');
      bf.tick(200);
    }
    const b = s.game.state.board;
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 10; x++) if (x !== 9) b[y * 10 + x] = 8;
    }
    s.press('hardDrop');
    s.release('hardDrop');
    bf.tick(1500);
  });
  await page.waitForFunction(
    () => window.__blockfall?.app.currentSession?.status === 'gameover',
    undefined,
    { timeout: 10_000 },
  );
  await page.getByRole('button', { name: 'Ver repetición' }).click();
  await page.evaluate(() => window.__blockfall?.tick(2000));
  // Se pone a media velocidad para que se vea el control.
  await page.evaluate(() => {
    document.getElementById('replay-speed')?.click();
  });
  await page.evaluate(() => window.__blockfall?.tick(600));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${tag}-11-replay-controls.png` });
});

test('captura de una posición preparada @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.locale = 'es';
      s.game.mode = 'practice';
      s.game.garbageEveryPieces = 0;
      s.game.drill = 'tspinTriple';
    });
    window.__blockfall?.app.refreshSettings();
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${tag}-12-drill.png` });
});

test('captura del menú con partida guardada @screenshots', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.evaluate(() => window.__blockfall?.tick(3600));
  for (const tecla of ['ArrowLeft', 'ArrowUp', 'Space', 'ArrowRight', 'Space']) {
    await page.keyboard.press(tecla);
    await page.evaluate(() => window.__blockfall?.tick(150));
  }
  // Ocultar la página guarda la partida.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continuar partida' }).waitFor({ state: 'visible' });
  const tag = testInfo.project.name;
  await page.screenshot({ path: `${OUT}/${tag}-13-resume.png` });
});
