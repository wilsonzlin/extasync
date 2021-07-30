import asyncTimeout from "@xtjs/lib/js/asyncTimeout";
import { cancellable, CancelledError } from "./cancellable";

test("it cancels execution midway", async () => {
  let reached = 0;
  let err: Error | undefined;
  const p = cancellable(function* () {
    yield asyncTimeout(500);
    reached++;
    yield asyncTimeout(700);
    reached++;
  });
  p.catch((e) => (err = e));
  await asyncTimeout(750);
  p.cancel();
  expect(reached).toStrictEqual(1);
  await asyncTimeout(1000);
  expect(reached).toStrictEqual(1);
  expect(err).toBeInstanceOf(CancelledError);
});

test("yields result in resolved values", async () => {
  const p = cancellable(function* () {
    const x = yield Promise.resolve(1);
    expect(x).toStrictEqual(1);
    return Promise.resolve(2);
  });
  expect(await p).toStrictEqual(2);
});

test("yielded AbortController objects are aborted if cancelled", async () => {
  const abortController = new AbortController();
  const cncl = cancellable(function* () {
    yield abortController;
    yield asyncTimeout(10000);
  });
  // If we don't catch, test will fail when errors are thrown on cancellation.
  const p = cncl.catch(() => void 0);
  cncl.cancel();
  await p;
  expect(abortController.signal.aborted).toStrictEqual(true);
});
