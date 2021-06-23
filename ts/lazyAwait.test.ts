import { lazyAwait } from "./lazyAwait";

test("it executes synchronously and returns immediately when not awaiting any Promise values", () => {
  const res = lazyAwait(function* (): Generator<any> {
    const x = yield "hello";
    return x;
  })();
  expect(res).toStrictEqual("hello");
});

test("it executes asynchronously and returns a Promise when awaiting at least one Promise value", async () => {
  const res = lazyAwait(function* (): Generator<any> {
    const x = yield Promise.resolve("hello");
    return x;
  })();
  expect(res).toBeInstanceOf(Promise);
  expect(await res).toStrictEqual("hello");
});
