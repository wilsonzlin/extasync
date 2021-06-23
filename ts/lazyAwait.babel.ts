import { PluginObj } from "@babel/core";
import * as types from "@babel/types";

const lazyAwaitBabelPlugin: PluginObj = {
  visitor: {
    CallExpression: {
      enter: (path) => {
        const { callee, arguments: args } = path.node;
        if (!types.isIdentifier(callee) || callee.name !== "lazyAwait") {
          return;
        }
        if (args.length !== 1) {
          throw new SyntaxError(
            `lazyAwait call has no or more than one argument`
          );
        }
        const arg = args[0];
        // Simplify: only accept arrow functions to handle .bind(this)
        // and ignore consideration of generator functions.
        if (!types.isArrowFunctionExpression(arg)) {
          throw new SyntaxError(
            `lazyAwait argument is not an arrow function expression`
          );
        }
        if (!arg.async) {
          throw new SyntaxError(`lazyAwait argument is not an async function`);
        }
        if (!types.isBlockStatement(arg.body)) {
          throw new SyntaxError(
            `lazyAwait argument is a function without a body`
          );
        }
        const argPath = path.get("arguments.0");
        if (Array.isArray(argPath)) {
          throw new Error(`Got array for Function`);
        }
        const bodyPath = argPath.get("body");
        if (Array.isArray(bodyPath)) {
          throw new Error(`Got array for BlockStatement`);
        }
        bodyPath.traverse({
          // This handles methods in nested classes. Properties on nested classes are still evaluated in the containing body's context.
          Function: (path) => {
            path.skip();
          },
          AwaitExpression: {
            exit: (path) => {
              path.replaceWith(types.yieldExpression(path.node.argument));
            },
          },
        });
        argPath.replaceWith(
          types.callExpression(
            types.memberExpression(
              types.functionExpression(
                null,
                arg.params,
                bodyPath.node as types.BlockStatement,
                true,
                false
              ),
              types.identifier("bind")
            ),
            [types.thisExpression()]
          )
        );
      },
    },
  },
};

export default () => lazyAwaitBabelPlugin;
