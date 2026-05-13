import type { ChaldeneService } from './ChaldeneService';

let _service: ChaldeneService | null = null;

export function initChaldeneService(service: ChaldeneService): void {
  _service = service;
}

export function getChaldeneService(): ChaldeneService | null {
  return _service;
}
