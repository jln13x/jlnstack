import { assertType, test } from "vitest";
import { createStore } from "../../core";
import {
  type Middleware,
  type Plugin,
  type PluginResult,
  plugins,
  type SetState,
  type StoreApi,
} from "../../types";
import { history } from "./index";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    actions: () => ({}),
    plugins: (store) => [history()(store)],
  });

  assertType<() => void>(store.extension.history.undo);
  assertType<() => void>(store.extension.history.redo);
  assertType<() => void>(store.extension.history.clear);
  assertType<() => boolean>(store.extension.history.canUndo);
  assertType<() => boolean>(store.extension.history.canRedo);
  assertType<() => { count: number; name: string }[]>(
    store.extension.history.pastStates,
  );
  assertType<() => { count: number; name: string }[]>(
    store.extension.history.futureStates,
  );
});

test("futureStates is not any", () => {
  type IsAny<T> = 0 extends 1 & T ? true : false;

  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([history()]),
  });

  type FutureStatesItem = ReturnType<
    typeof store.extension.history.futureStates
  >[number];
  assertType<false>({} as IsAny<FutureStatesItem>);
});

const g = {} as StoreApi<{ count: number }>;

const f = history()(g);

// ============================================
// EXPERIMENTS: Different approaches to preserve generic TState
// ============================================

// Current problem: Plugin type uses `any`, losing TState info
type CurrentPlugin = (store: StoreApi<any>) => PluginResult;

// -------------------------------------------
// Approach 1: Generic Plugin with state type parameter
// Problem: Can't collect heterogeneous plugins in array
// -------------------------------------------
type GenericPluginResult<TState, TExtend = unknown> = {
  id: string;
  extend?: TExtend;
  onStateChange?: (state: TState, prevState: TState) => void;
};

type GenericPlugin<TState, TExtend = unknown> = (
  store: StoreApi<TState>,
) => GenericPluginResult<TState, TExtend>;

// -------------------------------------------
// Approach 2: PluginFactory pattern - defer application
// The factory returns a "branded" type that carries its result type
// -------------------------------------------
type PluginFactory<TResult extends PluginResult> = <TState>(
  store: StoreApi<TState>,
) => TResult;

declare function plugins2<TResults extends PluginResult[]>(
  factories: { [K in keyof TResults]: PluginFactory<TResults[K]> },
): <TState>(store: StoreApi<TState>) => TResults;

// -------------------------------------------
// Approach 3: Builder/Chain pattern
// Each .use() call accumulates type info
// -------------------------------------------
interface PluginBuilder<TPlugins extends PluginResult[] = []> {
  use<TResult extends PluginResult>(
    factory: PluginFactory<TResult>,
  ): PluginBuilder<[...TPlugins, TResult]>;

  build: <TState>(store: StoreApi<TState>) => TPlugins;
}

declare function pluginBuilder(): PluginBuilder<[]>;

// Usage would be:
// pluginBuilder().use(history()).use(reset()).build

// -------------------------------------------
// Approach 4: Make plugins() infer from createStore context
// Pass plugin creators, not plugin functions
// -------------------------------------------
type PluginCreator<TOptions, TExtend> = (options?: TOptions) => <TState>(
  store: StoreApi<TState>,
) => {
  id: string;
  extend: TExtend;
  onStateChange?: (state: any, prevState: any) => void;
};

// The key insight: what if createStore infers plugins differently?
declare function createStore2<
  TState,
  TActions,
  TPluginFns extends ((store: StoreApi<TState>) => PluginResult)[],
>(options: {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?:
    | TPluginFns
    | ((store: StoreApi<TState>) => {
        [K in keyof TPluginFns]: TPluginFns[K] extends (s: any) => infer R
          ? R
          : never;
      });
}): any;

// -------------------------------------------
// Approach 5: HKT-style - store type param in result type
// -------------------------------------------
type PluginResultFor<TState> = {
  id: string;
  extend?: unknown;
  onStateChange?: (state: TState, prev: TState) => void;
};

// A "lazy" plugin that resolves its result type when given TState
type LazyPlugin<F extends <T>(s: StoreApi<T>) => PluginResultFor<T>> = F;

declare function plugins5<
  TFactories extends (<T>(s: StoreApi<T>) => PluginResultFor<T>)[],
>(
  factories: [...TFactories],
): <TState>(store: StoreApi<TState>) => {
  [K in keyof TFactories]: TFactories[K] extends <T>(s: StoreApi<T>) => infer R
    ? R extends PluginResultFor<infer _>
      ? R
      : never
    : never;
};

// ============================================
// TEST EXPERIMENTS
// ============================================

// Test: Does the history plugin type preserve TState in its return?
type HistoryPluginFn = ReturnType<typeof history>;
type HistoryResultWithNumber = ReturnType<
  HistoryPluginFn extends (s: StoreApi<infer T>) => infer R
    ? (s: StoreApi<{ count: number }>) => R
    : never
>;

// This is the crux - what does history() return?
const historyFn = history();
//    ^? should be <TState>(store: StoreApi<TState>) => { id: "history", extend: { futureStates: () => TState[] }, ... }

// When we apply it:
const historyResult = historyFn(g);
//    ^? should have extend.futureStates: () => { count: number }[]

// -------------------------------------------
// EXPERIMENT: What if plugins() receives the TState from createStore?
// -------------------------------------------

// Idea: plugins() returns a "marker" that createStore interprets
type PluginMarker<TFactories> = {
  __marker: "plugins";
  factories: TFactories;
};

declare function plugins6<TFactories extends ((...args: any[]) => Plugin)[]>(
  factories: TFactories,
): PluginMarker<TFactories>;

// Then createStore resolves it with known TState
type ResolvePlugins<TState, TMarker> = TMarker extends PluginMarker<
  infer TFactories
>
  ? {
      [K in keyof TFactories]: TFactories[K] extends () => (
        s: StoreApi<TState>,
      ) => infer R
        ? R
        : never;
    }
  : never;

// -------------------------------------------
// EXPERIMENT: Intersection approach
// -------------------------------------------

// What if each plugin "declares" what it adds via intersection?
type HistoryExtension<TState> = {
  history: {
    undo: () => void;
    redo: () => void;
    futureStates: () => TState[];
    pastStates: () => TState[];
  };
};

// Plugin declares both its runtime result AND its type contribution
declare function historyPlugin(): {
  <TState>(store: StoreApi<TState>): PluginResult;
  __extension: <TState>() => HistoryExtension<TState>;
};

// -------------------------------------------
// CORE ISSUE DEMO
// -------------------------------------------

// This works - TState flows through:
const workingTest = () => {
  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: (store) => [history()(store)], // TState inferred from store param
  });
  return store.extension.history.futureStates(); // correctly typed!
};

// This doesn't - TState becomes `any`:
// plugins([history()]) creates the array BEFORE TState is known
// So TypeScript resolves history()'s return as Plugin, losing the generic

// ============================================
// PROMISING APPROACH: Generic preservation via ReturnType inference
// ============================================

// The trick: Don't infer the PluginResult[] upfront
// Instead, let createStore apply each factory to StoreApi<TState> and infer results

type ApplyPlugins<
  TState,
  TFactories extends ((store: StoreApi<TState>) => PluginResult)[],
> = {
  [K in keyof TFactories]: ReturnType<TFactories[K]>;
};

// New plugins function that preserves factory types as a tuple
declare function pluginsNew<
  TFactories extends ((store: StoreApi<any>) => PluginResult)[],
>(
  factories: [...TFactories],
): {
  <TState>(store: StoreApi<TState>): ApplyPlugins<TState, TFactories>;
  __factories: TFactories;
};

// Test: Does this preserve types?
const testPluginsNew = pluginsNew([history()]);
const testStore = {} as StoreApi<{ count: number }>;
const testResults = testPluginsNew(testStore);
//    ^? Check if this preserves { extend: { futureStates: () => { count: number }[] } }

// ============================================
// ALTERNATIVE: Change how createStore accepts plugins
// ============================================

// Instead of: plugins?: (store: StoreApi<TState>) => TPlugins
// Use:        plugins?: PluginList<TState> where PluginList carries the factories

type PluginList<TFactories extends ((store: StoreApi<any>) => PluginResult)[]> =
  {
    __brand: "PluginList";
    factories: TFactories;
  };

declare function pluginList<
  TFactories extends ((store: StoreApi<any>) => PluginResult)[],
>(factories: [...TFactories]): PluginList<TFactories>;

// createStore would then have:
type CreateStoreOptionsAlt<
  TState,
  TActions,
  TPluginFactories extends ((store: StoreApi<TState>) => PluginResult)[],
> = {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: PluginList<TPluginFactories>;
};

// The magic: when inferring TPluginFactories from PluginList,
// we also have TState from `state`, so we can apply the factories properly

// ============================================
// KEY INSIGHT: Test direct array acceptance in createStore
// ============================================

// What if createStore accepts plugins as array directly?
declare function createStoreExperiment<
  TState,
  TActions,
  TPluginFactories extends ((store: StoreApi<TState>) => PluginResult)[],
>(options: {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: [...TPluginFactories];
}): {
  extension: ExtractExtensionsFromFactories<TState, TPluginFactories>;
};

// Helper to extract extensions when TState is known
type ExtractExtensionsFromFactories<
  TState,
  TFactories extends ((store: StoreApi<TState>) => PluginResult)[],
> = UnionToIntersection<
  {
    [K in keyof TFactories]: TFactories[K] extends (
      store: StoreApi<TState>,
    ) => infer R
      ? R extends { id: infer Id; extend: infer E }
        ? Id extends string
          ? { [P in Id]: E }
          : never
        : never
      : never;
  }[number]
>;

type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

// TEST THIS APPROACH
const experimentResult = createStoreExperiment({
  state: { count: 0, name: "test" },
  actions: () => ({}),
  plugins: [history()], // Direct array, no wrapper function!
});

// Does this preserve types?
type ExperimentFutureStates = ReturnType<
  typeof experimentResult.extension.history.futureStates
>;
//   ^? Should be { count: number; name: string }[]

// Type test
type IsExperimentAny = 0 extends 1 & ExperimentFutureStates[number]
  ? true
  : false;
assertType<false>({} as IsExperimentAny); // Should pass if not any!

// ============================================
// DEBUG: What type does history() actually return?
// ============================================

// The issue: `satisfies Plugin` in history.ts may widen the type
type HistoryReturnType = ReturnType<typeof history>;
//   ^? Should be <TState>(store: StoreApi<TState>) => { id: "history", extend: {...} }

// When we call history()(store), what do we get?
const debugStore = {} as StoreApi<{ x: number }>;
const debugResult = history()(debugStore);
type DebugResultType = typeof debugResult;
//   ^? Check if extend.futureStates returns { x: number }[]

// ============================================
// SIMPLER EXPERIMENT: Minimal generic plugin
// ============================================

// Define a plugin that definitely preserves its generic
function testPlugin<TState>(store: StoreApi<TState>) {
  return {
    id: "test" as const,
    extend: {
      getItems: () => [] as TState[],
    },
  };
}

// Can we infer TState when testPlugin is in an array?
declare function inferFromArray<
  TState,
  TPlugins extends ((store: StoreApi<TState>) => { id: string; extend: any })[],
>(
  state: TState,
  plugins: [...TPlugins],
): {
  results: { [K in keyof TPlugins]: ReturnType<TPlugins[K]> };
};

const inferTest = inferFromArray({ count: 0 }, [testPlugin]);
type InferTestResult = (typeof inferTest.results)[0]["extend"]["getItems"];
//   ^? Should be () => { count: number }[]

// ============================================
// THE FIX: history() should NOT use `satisfies Plugin`
// Instead, let TypeScript infer the full generic type
// ============================================

// What if history looked like this?
function historyFixed(options: { limit?: number } = {}) {
  return <TState>(store: StoreApi<TState>) => {
    const past: TState[] = [];
    const future: TState[] = [];

    return {
      id: "history" as const,
      onStateChange: (_state: TState, prevState: TState) => {
        past.push(prevState);
      },
      extend: {
        undo: () => {},
        redo: () => {},
        clear: () => {},
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
        pastStates: () => [...past],
        futureStates: () => [...future],
      },
    };
  };
  // NO satisfies Plugin!
}

// Test with fixed version
const fixedTest = inferFromArray({ count: 0, name: "hi" }, [historyFixed()]);
type FixedFutureStates = ReturnType<
  (typeof fixedTest.results)[0]["extend"]["futureStates"]
>;
//   ^? Should be { count: number; name: string }[]

type IsFixedAny = 0 extends 1 & FixedFutureStates[number] ? true : false;
assertType<false>({} as IsFixedAny);

// ============================================
// ✅ WORKING SOLUTION: Use inference at call site
// ============================================

// Key insight: TypeScript can infer TState from `state`, then use it to
// infer each plugin's return type. We need function overloads or a
// different signature structure.

// Approach: Make plugins a tuple where each element is inferred separately
declare function createStoreFinal<
  TState,
  TActions,
  P1 extends PluginResult,
>(options: {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: [(store: StoreApi<TState>) => P1];
}): {
  extension: { [K in P1["id"]]: P1 extends { extend: infer E } ? E : never };
};

// Overload for 2 plugins
declare function createStoreFinal<
  TState,
  TActions,
  P1 extends PluginResult,
  P2 extends PluginResult,
>(options: {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: [(store: StoreApi<TState>) => P1, (store: StoreApi<TState>) => P2];
}): {
  extension: { [K in P1["id"]]: P1 extends { extend: infer E } ? E : never } & {
    [K in P2["id"]]: P2 extends { extend: infer E } ? E : never;
  };
};

// FINAL TEST - single plugin
const finalStore = createStoreFinal({
  state: { count: 0, name: "test" },
  actions: () => ({}),
  plugins: [historyFixed()],
});

type FinalFutureStates = ReturnType<
  typeof finalStore.extension.history.futureStates
>;
type IsFinalAny = 0 extends 1 & FinalFutureStates[number] ? true : false;
assertType<false>({} as IsFinalAny); // ✅ Should pass!

// Verify the actual type
type ExpectedState = { count: number; name: string };
assertType<ExpectedState[]>({} as FinalFutureStates);

// ============================================
// ALTERNATIVE: Use ReturnType with generic instantiation
// ============================================

// The trick: Use a helper that "calls" the generic function type
type CallPlugin<TState, TPlugin> = TPlugin extends (
  store: StoreApi<TState>,
) => infer R
  ? R
  : TPlugin extends <S>(store: StoreApi<S>) => infer R2
    ? R2 // For generic functions, just get the return type (still generic)
    : never;

// Actually the solution is simpler - use inference in the constraint

// When we put historyFixed() in the array, we want TS to infer the RESULT type
// not keep it as a generic function

// The real fix: Don't constraint plugins to generic functions
// Instead, let TS infer the array element types naturally

declare function createStoreVariadic<
  TState,
  TActions,
  TResults extends PluginResult[],
>(options: {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  // Key: each element returns a specific PluginResult, inferred from calling with StoreApi<TState>
  plugins?: { [K in keyof TResults]: (store: StoreApi<TState>) => TResults[K] };
}): {
  extension: ExtractExtensions<TResults>;
};

type ExtractExtensions<TResults extends PluginResult[]> = {
  [K in TResults[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};

// ============================================
// PRESERVING ERGONOMICS: Different approaches
// ============================================

// Approach A: Use a looser type for satisfies that doesn't lose generics
type PluginShape = {
  id: string;
  extend?: unknown;
  onStateChange?: (state: any, prevState: any) => void;
  middleware?: Middleware;
};

// satisfies with generic function type - validates shape without widening
function historyWithSatisfiesA(options: { limit?: number } = {}) {
  return (<TState>(store: StoreApi<TState>) => {
    const past: TState[] = [];
    const future: TState[] = [];

    return {
      id: "history" as const,
      onStateChange: (_state: TState, prevState: TState) => {
        past.push(prevState);
      },
      extend: {
        futureStates: () => [...future],
        pastStates: () => [...past],
      },
    };
  }) satisfies <T>(store: StoreApi<T>) => PluginShape;
}

// Test A
const testA = createStoreVariadic({
  state: { count: 0 },
  actions: () => ({}),
  plugins: [historyWithSatisfiesA()],
});
type TestAFuture = ReturnType<typeof testA.extension.history.futureStates>;
type IsTestAAny = 0 extends 1 & TestAFuture[number] ? true : false;
assertType<false>({} as IsTestAAny); // Does this pass?

// Approach B: Helper function that validates AND preserves type
function definePlugin<
  TResult extends PluginShape,
  TFactory extends <TState>(store: StoreApi<TState>) => TResult,
>(factory: TFactory): TFactory {
  return factory;
}

function historyWithDefinePlugin(options: { limit?: number } = {}) {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    const past: TState[] = [];
    const future: TState[] = [];

    return {
      id: "history" as const,
      onStateChange: (_state: TState, prevState: TState) => {
        past.push(prevState);
      },
      extend: {
        futureStates: () => [...future],
        pastStates: () => [...past],
        lorem: () => {
          return {
            past: past,
            ipsum: "dolor",
          };
        },
      },
    };
  });
}

// Test B
const testB = createStoreVariadic({
  state: { name: "test" },
  actions: () => ({}),
  plugins: [historyWithDefinePlugin()],
});
type TestBFuture = ReturnType<typeof testB.extension.history.futureStates>;
type IsTestBAny = 0 extends 1 & TestBFuture[number] ? true : false;
assertType<false>({} as IsTestBAny); // Does this pass?

// Approach C: Simpler - just use `as const` on id and skip satisfies
// (Already tested above with historyFixed)

const lore = testB.extension.history.lorem();

// ============================================
// TEST: Multiple different plugins with definePlugin
// ============================================

function resetPlugin() {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    const initialState = store.getState();
    return {
      id: "reset" as const,
      extend: {
        reset: () => store.setState(initialState),
        getInitial: () => initialState,
      },
    };
  });
}

function loggerPlugin(prefix: string) {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    return {
      id: "logger" as const,
      onStateChange: (state: TState, prev: TState) => {
        console.log(prefix, { state, prev });
      },
      extend: {
        getLogs: () => [] as { state: TState; prev: TState }[],
      },
    };
  });
}

// Test with multiple plugins
const multiPluginStore = createStoreVariadic({
  state: { count: 0, items: ["a", "b"] },
  actions: () => ({}),
  plugins: [historyWithDefinePlugin(), resetPlugin(), loggerPlugin("test:")],
});

// Check history extension types
type MultiHistory = ReturnType<
  typeof multiPluginStore.extension.history.futureStates
>;
assertType<{ count: number; items: string[] }[]>({} as MultiHistory);

// Check reset extension types
type MultiReset = ReturnType<
  typeof multiPluginStore.extension.reset.getInitial
>;
assertType<{ count: number; items: string[] }>({} as MultiReset);

// Check logger extension types
type MultiLogger = ReturnType<typeof multiPluginStore.extension.logger.getLogs>;
assertType<
  {
    state: { count: number; items: string[] };
    prev: { count: number; items: string[] };
  }[]
>({} as MultiLogger);

// Verify none are any
type IsMultiHistoryAny = 0 extends 1 & MultiHistory[number] ? true : false;
type IsMultiResetAny = 0 extends 1 & MultiReset ? true : false;
type IsMultiLoggerAny = 0 extends 1 & MultiLogger[number] ? true : false;
assertType<false>({} as IsMultiHistoryAny);
assertType<false>({} as IsMultiResetAny);
assertType<false>({} as IsMultiLoggerAny);

// ============================================
// TEST: Actual usage without any casts
// ============================================

function testActualUsage() {
  const store = createStoreVariadic({
    state: { count: 0, name: "hello" },
    actions: () => ({}),
    plugins: [historyWithDefinePlugin(), resetPlugin()],
  });

  // Access future states - should be { count: number; name: string }[]
  const futures = store.extension.history.futureStates();
  const firstFuture = futures[0];
  if (firstFuture) {
    const count: number = firstFuture.count; // ✅ Should work
    const name: string = firstFuture.name; // ✅ Should work
    // @ts-expect-error - nope doesn't exist
    const nope = firstFuture.nope;
  }

  // Access initial state from reset - should be { count: number; name: string }
  const initial = store.extension.reset.getInitial();
  const initialCount: number = initial.count; // ✅ Should work
  const initialName: string = initial.name; // ✅ Should work
  // @ts-expect-error - missing doesn't exist
  const missing = initial.missing;

  // Call reset - should accept no args and return void
  store.extension.reset.reset();

  // Access past states
  const pasts = store.extension.history.pastStates();
  pasts.forEach((state) => {
    const c: number = state.count;
    const n: string = state.name;
  });
}

// Test variadic
const variadicStore = createStoreVariadic({
  state: { x: 1, y: "hello" },
  actions: () => ({}),
  plugins: [historyFixed()],
});

type VariadicFuture = ReturnType<
  typeof variadicStore.extension.history.futureStates
>;
type IsVariadicAny = 0 extends 1 & VariadicFuture[number] ? true : false;
assertType<false>({} as IsVariadicAny);
assertType<{ x: number; y: string }[]>({} as VariadicFuture);
