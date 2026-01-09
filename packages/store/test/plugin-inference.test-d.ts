import { assertType, test } from "vitest";
import { createPlugin, createStore } from "../src/index";

const bazPlugin = createPlugin({
  id: "baz",
  extend: () => ({
    baz: () => "baz",
  }),
});

test("inline plugin extends store with inferred type", () => {
  const store = createStore(
    { state: { count: 0 } },
    {
      plugins: [
        {
          id: "foo",
          extend: () => ({
            foo: () => "foo",
          }),
        },
        {
          id: "bar",
          extend: () => ({
            bar: () => "bar",
          }),
        },
        bazPlugin,
      ],
    },
  );

  assertType<{
    foo: { foo: () => string };
    bar: { bar: () => string };
    baz: { baz: () => string };
  }>(store.extensions);
});
