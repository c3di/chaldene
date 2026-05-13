import { type ISignal } from '@lumino/signaling';

/**
 * Returns a Promise that resolves with the signal's argument on the next emit.
 * Disconnects itself automatically so it fires only once.
 */
export function waitForSignal<T>(signal: ISignal<any, T>): Promise<T> {
  return new Promise<T>(resolve => {
    const handler = (_sender: any, args: T) => {
      signal.disconnect(handler);
      resolve(args);
    };
    signal.connect(handler);
  });
}
