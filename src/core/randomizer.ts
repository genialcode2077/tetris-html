import { PIECE_TYPES, type PieceType } from './types';
import type { Rng } from './rng';

/** Generador 7-bag (Random Generator de la Guideline). */
export class BagRandomizer {
  private bag: PieceType[] = [];

  constructor(private readonly rng: Rng) {}

  next(): PieceType {
    if (this.bag.length === 0) this.refill();
    const piece = this.bag.pop();
    if (piece === undefined) throw new Error('bag vacía');
    return piece;
  }

  private refill(): void {
    const bag = [...PIECE_TYPES];
    // Fisher–Yates
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      const a = bag[i];
      const b = bag[j];
      if (a !== undefined && b !== undefined) {
        bag[i] = b;
        bag[j] = a;
      }
    }
    this.bag = bag;
  }
}
