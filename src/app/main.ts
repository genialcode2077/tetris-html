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

declare global {
  interface Window {
    __blockfall?: { app: App; store: Store; tick: (ms: number) => void };
  }
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
