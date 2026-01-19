# AI Agent Guidelines

Instructions for AI agents working with this codebase.

## TypeScript

### Prefer Type Inference

Always prefer type inference over manual type annotations when possible. TypeScript's type inference is powerful and reduces redundancy.

```ts
// Good - let TypeScript infer the type
const count = 0;
const items = ["a", "b", "c"];
const result = someFunction();

// Bad - unnecessary manual type annotations
const count: number = 0;
const items: string[] = ["a", "b", "c"];
const result: ReturnType<typeof someFunction> = someFunction();
```

Only add explicit type annotations when:

- The type cannot be inferred (e.g., function parameters, empty arrays/objects)
- You need to widen or narrow the inferred type
- It improves readability for complex types
- It's required for public API boundaries

```ts
// Explicit types are needed here
function process(input: string): void { ... }
const emptyItems: string[] = [];
const config: Config = {}; // when {} doesn't match the shape
```

### Use `const` Type Parameter Modifier

Use the `const` modifier for generic type parameters when you need to preserve literal types:

```ts
// Good - preserves literal types
function createRoutes<const R extends string>(): Routes<R>

// Bad - loses literal type information
function createRoutes<R extends string>(): Routes<R>
```

### Prefer `infer` Over Manual Type Extraction

Use conditional types with `infer` to extract types rather than manual indexing when it improves readability:

```ts
// Good
type ExtractParams<T> = T extends { params: infer P } ? P : never;

// Acceptable but more verbose
type ExtractParams<T> = T extends { params: unknown } ? T["params"] : never;
```
