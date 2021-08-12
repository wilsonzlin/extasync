// Execute an async function, suspending execution on await only on Promise
// values (and not always, which is the spec behaviour).
// Why do we need a generator runtime instead of a simple Babel transform of
// await expressions?
// Because although a Babel transform can handle await expressions, it doesn't
// change the fact that the containing function is async, and will always return
// a Promise, even if all the nested await expression suspensions are optimised
// away at runtime.
export const lazyAwait = <Fn extends Function>(fn: Fn): Fn =>
  function (this: any) {
    const it = (fn as any as GeneratorFunction).apply(this, arguments as any);
    let lastResolved:
      | undefined
      // [true, errorValue] or [false, resolvedValue].
      | [true, any]
      | [false, any] = undefined;
    while (true) {
      // Run as much code synchronously as possible.
      let res;

      // Allow this to throw.
      res = lastResolved?.[0]
        ? it.throw(lastResolved[1])
        : it.next(lastResolved?.[1]);
      if (res.done) {
        // Return even if it's a Promise.
        return res.value;
      }
      if (!(res.value instanceof Promise)) {
        lastResolved = [false, res.value];
        continue;
      }
      // We've awaited a real Promise, so we must return a Promise.
      return (async () => {
        do {
          try {
            lastResolved = [false, await res.value];
          } catch (e) {
            lastResolved = [true, e];
          }
          // Allow this to throw.
          res = lastResolved?.[0]
            ? it.throw(lastResolved[1])
            : it.next(lastResolved?.[1]);

          if (res.done) {
            return res.value;
          }
        } while (true);
      })();
    }
  } as any;
