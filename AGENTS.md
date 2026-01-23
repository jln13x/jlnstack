# AI Agent Guidelines

Instructions for AI agents working with this codebase.

## Documentation Requirements

Every package must be properly documented in the docs app (`apps/docs`).

### Required Documentation Steps

1. **Create package documentation folder**: `apps/docs/content/docs/<package-name>/`
2. **Add to navigation**: Add the package to `apps/docs/content/docs/meta.json` in the `pages` array
3. **Link from index**: Add a `<Card>` entry in `apps/docs/content/docs/index.mdx` with title, href, and description
4. **Create package meta.json**: Add `apps/docs/content/docs/<package-name>/meta.json` with:
   ```json
   {
     "title": "Package Name",
     "description": "Brief description",
     "root": true,
     "pages": ["index", "installation", ...]
   }
   ```

## Package Guidelines

### Type Declarations

1. **Prefer inference over explicit type declarations** when possible. TypeScript's type inference is powerful and reduces redundancy.

   ```ts
   // Good - let TypeScript infer
   const count = 0;
   const result = someFunction();

   // Bad - unnecessary annotations
   const count: number = 0;
   const result: ReturnType<typeof someFunction> = someFunction();
   ```

2. **Co-locate types with implementation**. Don't create separate type files unless:
   - Required to avoid circular dependencies
   - Types need to be shared across multiple unrelated files
   - The type definitions are extensive and would clutter the implementation

   ```ts
   // Good - types next to implementation
   type FilterOptions = { ... };
   function createFilter(options: FilterOptions) { ... }

   // Avoid - separate types.ts file for no reason
   // types.ts
   export type FilterOptions = { ... };
   // filter.ts
   import type { FilterOptions } from "./types";
   ```

3. **Only add explicit type annotations when**:
   - The type cannot be inferred (function parameters, empty arrays/objects)
   - You need to widen or narrow the inferred type
   - It improves readability for complex types
   - It's required for public API boundaries

4. **Internal type casts are acceptable** when the cast is contained within the implementation and doesn't leak to consumers. This applies to:
   - Complex generic transformations where TypeScript's inference falls short
   - Integrations with external libraries whose types don't align cleanly
   - Internal state management, middleware patterns, or plugin systems

   The key principle: consumer-facing APIs must remain fully type-safe.

   ```ts
   // Acceptable - internal casts, consumer types are preserved
   let pluginResults: TResults = [] as unknown as TResults;

   const middleware = (setState, getState) => (updater: unknown) => {
     setState(produce(getState(), updater as (draft: any) => void));
   };

   // Not acceptable - cast leaks to consumer
   export function getState(): any { ... }
   ```

### Exports

Only export functions and types that are useful for consumers. Internal utilities should remain unexported.

```ts
// Good - only export what consumers need
export { createStore } from "./store";
export type { StoreOptions } from "./store";

// Bad - exporting internal helpers
export { createStore, internalHelper, debugUtil } from "./store";
```

### Use `const` Type Parameter Modifier

Use the `const` modifier for generic type parameters when you need to preserve literal types:

```ts
// Good - preserves literal types
function createRoutes<const R extends string>(): Routes<R>

// Bad - loses literal type information
function createRoutes<R extends string>(): Routes<R>
```

## Testing Requirements

Every package must have comprehensive tests.

### Runtime Tests

- Test core functionality and edge cases
- Use Vitest as the test runner
- Place tests in `test/` directory or co-locate with `*.test.ts` suffix

### Type Tests

Use type tests (`.test-d.ts` files) when:
- The package has complex type inference that should be verified
- Public API types need to be stable and tested
- Generic types need to produce correct output types

```ts
// example.test-d.ts
import { expectTypeOf } from "vitest";
import { createStore } from "./store";

test("store state type is inferred correctly", () => {
  const store = createStore({ count: 0 });
  expectTypeOf(store.getState()).toEqualTypeOf<{ count: number }>();
});
```
