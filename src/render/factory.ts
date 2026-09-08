import { CanvasRenderer } from './canvas2d/CanvasRenderer';
import type { RenderOptions, Renderer } from './types';

export type RendererKind = 'canvas2d' | 'three';

export interface RendererHandle {
  readonly kind: RendererKind;
  readonly renderer: Renderer;
}

export interface CreateRendererArgs {
  readonly kind: RendererKind;
  readonly container: HTMLElement;
  readonly options: RenderOptions;
  /** Se llama si el modo 3D no arranca o se degrada; el anfitrión debe volver a Canvas 2D. */
  readonly onFallback: (reason: string) => void;
}

/**
 * Crea el renderer pedido. El modo 3D se descarga con `import()` para que
 * quien no lo use no pague su coste (ADR-0008).
 */
export async function createRenderer(args: CreateRendererArgs): Promise<RendererHandle> {
  const { kind, container, options, onFallback } = args;
  if (kind === 'three') {
    try {
      const module = await import('./three/ThreeRenderer');
      if (!module.supports3d()) {
        onFallback('este dispositivo no soporta WebGPU ni WebGL2');
      } else {
        const renderer = new module.ThreeRenderer();
        renderer.onFallback = onFallback;
        renderer.init(container, options);
        return { kind: 'three', renderer };
      }
    } catch (error) {
      onFallback(`no se pudo cargar el modo 3D: ${String(error)}`);
    }
  }
  const renderer = new CanvasRenderer();
  renderer.init(container, options);
  return { kind: 'canvas2d', renderer };
}
