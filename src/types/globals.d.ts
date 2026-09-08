/** Gancho de depuración y pruebas, disponible solo en desarrollo y con VITE_E2E=1. */
import type { App } from '@/app/app';
import type { Store } from '@/storage/store';

declare global {
  interface Window {
    __blockfall?: {
      app: App;
      store: Store;
      tick: (ms: number) => void;
    };
  }
}

export {};
