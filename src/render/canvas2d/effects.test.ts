import { describe, expect, it } from 'vitest';
import { ParticleSystem, Shake, easeInQuad, easeOutCubic } from './effects';

/** Llena el sistema hasta agotar su presupuesto. */
function fill(system: ParticleSystem, count = 2000): void {
  for (let i = 0; i < count; i++) system.burst(0, 0, 1, '#fff', 100, 4);
}

/** Simula n cuadros con el coste indicado. */
function frames(system: ParticleSystem, n: number, costMs: number, budgetMs = 6): void {
  for (let i = 0; i < n; i++) system.reportFrameCost(costMs, budgetMs);
}

describe('presupuesto de partículas', () => {
  it('arranca al máximo y no lo supera', () => {
    const system = new ParticleSystem(100);
    expect(system.currentBudget).toBe(100);
    fill(system);
    expect(system.particles.length).toBe(100);
  });

  it('un cuadro lento suelto no cambia nada', () => {
    const system = new ParticleSystem(600);
    frames(system, 3, 10);
    expect(system.currentBudget).toBe(600);
  });

  it('varios cuadros lentos seguidos recortan el presupuesto', () => {
    const system = new ParticleSystem(600);
    frames(system, 12, 10);
    expect(system.currentBudget).toBeLessThan(600);
    const afterFirst = system.currentBudget;
    frames(system, 12, 10);
    expect(system.currentBudget).toBeLessThan(afterFirst);
  });

  it('al recortar también descarta las partículas que sobran', () => {
    const system = new ParticleSystem(600);
    fill(system);
    expect(system.particles.length).toBe(600);
    frames(system, 12, 10);
    expect(system.particles.length).toBeLessThanOrEqual(system.currentBudget);
  });

  it('nunca baja del suelo, para que el efecto siga viéndose', () => {
    const system = new ParticleSystem(600);
    frames(system, 500, 40);
    expect(system.currentBudget).toBeGreaterThanOrEqual(40);
  });

  it('se recupera despacio cuando vuelve a ir holgado', () => {
    const system = new ParticleSystem(600);
    frames(system, 12, 10);
    const recortado = system.currentBudget;
    frames(system, 5, 1);
    const parcial = system.currentBudget;
    expect(parcial).toBeGreaterThan(recortado);
    expect(parcial).toBeLessThan(600);
    frames(system, 1000, 1);
    expect(system.currentBudget).toBe(600);
  });

  it('una partida nueva empieza con el presupuesto entero', () => {
    const system = new ParticleSystem(600);
    frames(system, 24, 20);
    expect(system.currentBudget).toBeLessThan(600);
    system.resetBudget();
    expect(system.currentBudget).toBe(600);
  });

  it('las partículas caen y acaban desapareciendo', () => {
    const system = new ParticleSystem(50);
    system.burst(10, 10, 5, '#fff', 100, 4);
    expect(system.particles.length).toBe(5);
    system.update(2000);
    expect(system.particles.length).toBe(0);
  });
});

describe('sacudida de pantalla', () => {
  it('se desvanece sola y vuelve al centro', () => {
    const shake = new Shake();
    shake.add(1);
    shake.update(16, 10);
    expect(Math.abs(shake.offsetX) + Math.abs(shake.offsetY)).toBeGreaterThan(0);
    shake.update(2000, 10);
    expect(Math.abs(shake.offsetX)).toBe(0);
    expect(Math.abs(shake.offsetY)).toBe(0);
    expect(Math.abs(shake.angle)).toBe(0);
  });

  it('no se acumula más allá del máximo', () => {
    const shake = new Shake();
    for (let i = 0; i < 20; i++) shake.add(1);
    shake.update(16, 10);
    expect(Math.abs(shake.offsetX)).toBeLessThanOrEqual(10);
  });
});

describe('curvas de suavizado', () => {
  it('van de cero a uno sin salirse', () => {
    for (const ease of [easeOutCubic, easeInQuad]) {
      expect(ease(0)).toBeCloseTo(0, 6);
      expect(ease(1)).toBeCloseTo(1, 6);
      expect(ease(0.5)).toBeGreaterThan(0);
      expect(ease(0.5)).toBeLessThan(1);
    }
  });
});
