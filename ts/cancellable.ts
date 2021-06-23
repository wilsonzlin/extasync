import isPlainObject from "extlib/js/isPlainObject";

export const IS_CANCELLABLE = Symbol();

export type Cancellable<T> = Promise<T> & {
  [IS_CANCELLABLE]: true;
  cancel(): void;
};

const isAbortController = (val: unknown): val is AbortController => {
  try {
    return val instanceof AbortController;
  } catch {
    return false;
  }
};

export const isCancellable = (val: unknown): val is Cancellable<unknown> =>
  isPlainObject(val) && IS_CANCELLABLE in val;

export class CancelledError extends Error {}

export const cancellable = <T>(
  fn: () => Generator | Promise<T>
): Cancellable<T> => {
  const generator = fn as any as GeneratorFunction;
  let cancelled = false;
  const subtasks: (Promise<any> | Cancellable<any> | AbortController)[] = [];
  const promise: any = (async () => {
    const it = generator();
    let lastResolved:
      | undefined
      // [true, errorValue] or [false, resolvedValue].
      | [true, any]
      | [false, any] = undefined;
    while (true) {
      if (cancelled) {
        // Don't call it.throw as that would allow iterator to catch and continue.
        // Don't call it.return as it doesn't seem to do anything; it doesn't even run finally blocks in the generator function.
        throw new CancelledError();
      }

      // Allow this to throw.
      const next = lastResolved?.[0]
        ? it.throw(lastResolved[1])
        : it.next(lastResolved?.[1]);

      // `cancelled` could not have changed since last check as code since was run synchronously.
      if (next.done) {
        return await next.value;
      }

      const yielded = next.value as any;
      subtasks.push(yielded);
      if (isAbortController(yielded)) {
        lastResolved = undefined;
      } else {
        try {
          lastResolved = [false, await yielded];
        } catch (e) {
          lastResolved = [true, e];
        }
      }
    }
  })();

  // Don't return Promise as custom properties set on it like `cancel` won't stick.
  return {
    then: (f, r) => promise.then(f, r),
    catch: (r) => promise.catch(r),
    finally: (n) => promise.finally(n),
    // This should not throw any exceptions, including CancelledError.
    cancel: () => {
      cancelled = true;
      for (const subtask of subtasks) {
        if (isAbortController(subtask)) {
          subtask.abort();
        } else if (isCancellable(subtask)) {
          subtask.cancel();
        }
      }
    },
    [Symbol.toStringTag]: "Cancellable",
    [IS_CANCELLABLE]: true,
  };
};
