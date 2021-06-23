import * as babel from "@babel/core";
import lazyAwaitBabelPlugin from "./lazyAwait.babel";

test("it transforms correctly", async () => {
  const res = await babel.transformAsync(
    `
const fn = lazyAwait(async () => {
  const x = 1 + await maybeAsync();
  const y = await arr.map(async () => await maybeAsync());
});

class C {
  m = lazyAwait(async () => {
    await 1 + call(await 2);
  });
}
  `.trim(),
    {
      babelrc: false,
      configFile: false,
      plugins: [lazyAwaitBabelPlugin],
    }
  );
  expect(res?.code).toStrictEqual(
    `
const fn = lazyAwait(function* () {
  const x = 1 + (yield maybeAsync());
  const y = yield arr.map(async () => await maybeAsync());
}.bind(this));

class C {
  m = lazyAwait(function* () {
    (yield 1) + call(yield 2);
  }.bind(this));
}
  `.trim()
  );
});
