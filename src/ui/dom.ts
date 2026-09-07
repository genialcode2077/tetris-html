export type Child = Node | string | null | undefined | false;

/** Crea un elemento con atributos y descendientes. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | EventListener | undefined> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'className') {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

export function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado`);
  return el;
}

/** Como byId, comprobando el tipo concreto del elemento. */
export function byIdAs<T extends HTMLElement>(id: string, ctor: abstract new () => T): T {
  const el = byId(id);
  if (!(el instanceof ctor)) throw new Error(`Elemento #${id} no es ${ctor.name}`);
  return el;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
