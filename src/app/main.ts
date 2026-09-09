import '@/ui/styles.css';
import { Store } from '@/storage/store';
import { App } from './app';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = new Store(storage());
const app = new App(store);
app.start();

// Actualización de la aplicación instalada: el service worker nuevo espera y
// entra cuando no hay una partida que perder (ADR-0010). Se registra a mano con
// la API del navegador para no añadir dependencias.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let pedida = false;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        /** Le da paso a la versión que está esperando. */
        const letIn = (worker: ServiceWorker): void => {
          app.onUpdateReady(() => {
            pedida = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          });
        };
        // Ya había una esperando de una visita anterior.
        if (reg.waiting && navigator.serviceWorker.controller) letIn(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const nuevo = reg.installing;
          if (!nuevo) return;
          nuevo.addEventListener('statechange', () => {
            // Con controlador previo es una actualización; sin él, la primera
            // instalación, que no hay que anunciar ni recargar.
            if (nuevo.state === 'installed' && navigator.serviceWorker.controller) letIn(nuevo);
          });
        });
      })
      .catch(() => {
        // Sin service worker el juego funciona igual, solo que sin uso sin conexión.
      });
  });

  // La recarga solo se hace si el relevo lo pedimos nosotros.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!pedida) return;
    pedida = false;
    window.location.reload();
  });
}

// Gancho de depuración/e2e (no se incluye en producción).
if (import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.VITE_E2E === '1') {
  window.__blockfall = {
    app,
    store,
    tick: (ms: number) => {
      app.debugTick(ms);
    },
  };
}
