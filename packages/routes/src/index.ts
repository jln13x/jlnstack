import type { StandardSchemaV1 } from "@standard-schema/spec";
import { createRecursiveProxy } from "./proxy";

type ValidParamValue =
  | string
  | number
  | boolean
  | bigint
  | string[]
  | readonly string[];

type ParamMapValue =
  | ValidParamValue
  | StandardSchemaV1<unknown, ValidParamValue>;

type ParamMapConstraint<Routes extends string> = {
  [K in Routes]?: Record<string, ParamMapValue>;
};

type SearchParamValue =
  | string
  | number
  | boolean
  | string[]
  | StandardSchemaV1<unknown, string | number | boolean | string[]>;

type SearchParamMapConstraint<Routes extends string> = {
  [K in Routes]?: Record<string, SearchParamValue>;
};

type ExtractRouteParams<Route extends string> =
  Route extends `${string}[[...${infer Param}]]${infer Rest}`
    ? Param | ExtractRouteParams<Rest>
    : Route extends `${string}[...${infer Param}]${infer Rest}`
      ? Param | ExtractRouteParams<Rest>
      : Route extends `${string}[${infer Param}]${infer Rest}`
        ? Param | ExtractRouteParams<Rest>
        : never;

type RouteConfigFor<Route extends string> = {
  params?: { [K in ExtractRouteParams<Route>]?: ParamMapValue };
  searchParams?: Record<string, SearchParamValue>;
};

type RoutesConfigConstraint<Routes extends string, T = {}> = {
  [K in Routes]?: RouteConfigFor<K>;
} & {
  [K in keyof T]: K extends Routes ? RouteConfigFor<K> : never;
};

type ExtractParamMap<Routes extends string, Config> = {
  [K in Routes]: K extends keyof Config
    ? Config[K] extends {
        params: infer P extends Record<string, ParamMapValue>;
      }
      ? P
      : undefined
    : undefined;
};

type ExtractSearchParamMap<Routes extends string, Config> = {
  [K in Routes]: K extends keyof Config
    ? Config[K] extends {
        searchParams: infer SP extends Record<string, SearchParamValue>;
      }
      ? SP
      : undefined
    : undefined;
};

type ExtractSearchParamType<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T;

type SearchParamsFor<
  Routes extends string,
  Path extends string,
  SearchParamMap extends SearchParamMapConstraint<Routes>,
> = Path extends keyof SearchParamMap
  ? SearchParamMap[Path] extends infer SP
    ? SP extends Record<string, SearchParamValue>
      ? { [K in keyof SP]?: ExtractSearchParamType<SP[K]> }
      : Record<string, string | number | boolean | string[] | undefined>
    : Record<string, string | number | boolean | string[] | undefined>
  : Record<string, string | number | boolean | string[] | undefined>;

type ExtractParamType<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T;

// Find param in current path, children, or parent routes
type FindParamInMap<
  Routes extends string,
  CurrentPath extends string,
  ParamName extends string,
  ParamMap extends ParamMapConstraint<Routes>,
> = {
  [R in Routes]: R extends `${CurrentPath}${"" | `/${string}`}`
    ? R extends keyof ParamMap
      ? ParamName extends keyof NonNullable<ParamMap[R]>
        ? ExtractParamType<NonNullable<ParamMap[R]>[ParamName]>
        : never
      : never
    : never;
}[Routes];

// Find param schema in parent routes (for inheritance)
type FindParamInParentRoutes<
  Routes extends string,
  CurrentPath extends string,
  ParamName extends string,
  ParamMap extends ParamMapConstraint<Routes>,
> = {
  [R in Routes]: CurrentPath extends `${R}/${string}`
    ? R extends keyof ParamMap
      ? ParamName extends keyof NonNullable<ParamMap[R]>
        ? ExtractParamType<NonNullable<ParamMap[R]>[ParamName]>
        : never
      : never
    : never;
}[Routes];

type GetParamType<
  Routes extends string,
  CurrentPath extends string,
  ParamName extends string,
  ParamMap extends ParamMapConstraint<Routes>,
  DefaultType,
> =
  // First try to find in current path and children (existing behavior)
  [FindParamInMap<Routes, CurrentPath, ParamName, ParamMap>] extends [never]
    ? // If not found, try parent routes (inheritance)
      [FindParamInParentRoutes<Routes, CurrentPath, ParamName, ParamMap>] extends
        [never]
      ? DefaultType
      : FindParamInParentRoutes<Routes, CurrentPath, ParamName, ParamMap>
    : FindParamInMap<Routes, CurrentPath, ParamName, ParamMap>;

type SegmentName<S extends string> = S extends `[...${infer N}]`
  ? N
  : S extends `[[...${infer N}]]`
    ? N
    : S extends `[${infer N}]`
      ? N
      : S;

type ChildSegments<
  Routes extends string,
  Path extends string,
> = Routes extends `${Path}/${infer Next}/${string}`
  ? SegmentName<Next>
  : Routes extends `${Path}/${infer Next}`
    ? SegmentName<Next>
    : never;

type IsDynamicSegment<S extends string> = S extends
  | `[${string}]`
  | `[...${string}]`
  | `[[...${string}]]`
  ? true
  : false;

type IsCatchAllSegment<S extends string> = S extends `[...${string}]`
  ? true
  : false;

type IsOptionalCatchAllSegment<S extends string> = S extends `[[...${string}]]`
  ? true
  : false;

type GetOriginalSegment<
  Routes extends string,
  Path extends string,
  Seg extends string,
> = Routes extends `${Path}/${infer Next}/${string}`
  ? SegmentName<Next> extends Seg
    ? Next
    : never
  : Routes extends `${Path}/${infer Next}`
    ? SegmentName<Next> extends Seg
      ? Next
      : never
    : never;

type IsDynamicAtPath<
  Routes extends string,
  Path extends string,
  Seg extends string,
> = GetOriginalSegment<Routes, Path, Seg> extends infer Original
  ? Original extends string
    ? IsDynamicSegment<Original> extends true
      ? true
      : false
    : false
  : false;

type IsCatchAllAtPath<
  Routes extends string,
  Path extends string,
  Seg extends string,
> = GetOriginalSegment<Routes, Path, Seg> extends infer Original
  ? Original extends string
    ? IsCatchAllSegment<Original> extends true
      ? true
      : false
    : false
  : false;

type IsOptionalCatchAllAtPath<
  Routes extends string,
  Path extends string,
  Seg extends string,
> = GetOriginalSegment<Routes, Path, Seg> extends infer Original
  ? Original extends string
    ? IsOptionalCatchAllSegment<Original> extends true
      ? true
      : false
    : false
  : false;

type Join<
  T extends readonly string[],
  Sep extends string,
> = T extends readonly [
  infer First extends string,
  ...infer Rest extends readonly string[],
]
  ? Rest["length"] extends 0
    ? First
    : `${First}${Sep}${Join<Rest, Sep>}`
  : "";

type Stringify<T> = T extends string | number | boolean | bigint
  ? `${T}`
  : never;

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type UnionToLast<U> = UnionToIntersection<
  U extends unknown ? () => U : never
> extends () => infer R
  ? R
  : never;

type UnionToTuple<U, R extends unknown[] = [], Last = UnionToLast<U>> = [
  U,
] extends [never]
  ? R
  : UnionToTuple<Exclude<U, Last>, [Last, ...R]>;

type JoinStrings<
  T extends readonly string[],
  Sep extends string = "&",
> = T extends readonly [infer Only extends string]
  ? Only
  : T extends readonly [
        infer First extends string,
        ...infer Rest extends readonly string[],
      ]
    ? `${First}${Sep}${JoinStrings<Rest, Sep>}`
    : "";

type ArrayToQueryPairs<
  K extends string,
  T extends readonly unknown[],
> = T extends readonly [infer First, ...infer Rest extends readonly unknown[]]
  ? First extends string | number | boolean | bigint
    ? Rest["length"] extends 0
      ? `${K}=${First}`
      : `${K}=${First}` | ArrayToQueryPairs<K, Rest>
    : never
  : never;

type QueryPairs<T extends Record<string, unknown>> = {
  [K in keyof T]-?: T[K] extends undefined | never
    ? never
    : T[K] extends readonly (string | number | boolean | bigint)[]
      ? ArrayToQueryPairs<K & string, T[K]>
      : `${K & string}=${Stringify<T[K]>}`;
}[keyof T];

type BuildQueryString<T extends Record<string, unknown>> = JoinStrings<
  UnionToTuple<QueryPairs<T>> extends readonly string[]
    ? UnionToTuple<QueryPairs<T>>
    : never
>;

type AppendQuery<Path extends string, SP> = SP extends Record<string, unknown>
  ? [keyof SP] extends [never]
    ? Path
    : BuildQueryString<SP> extends infer QS extends string
      ? QS extends ""
        ? Path
        : `${Path}?${QS}`
      : Path
  : Path;

type ReplaceDynamicSegments<
  Path extends string,
  P extends Record<string, unknown>,
> = Path extends `${infer Start}/[[...${infer Param}]]${infer Rest}`
  ? Param extends keyof P
    ? P[Param] extends readonly string[]
      ? `${ReplaceDynamicSegments<Start, P>}/${Join<P[Param], "/">}${ReplaceDynamicSegments<Rest, P>}`
      : `${ReplaceDynamicSegments<Start, P>}${ReplaceDynamicSegments<Rest, P>}`
    : `${ReplaceDynamicSegments<Start, P>}${ReplaceDynamicSegments<Rest, P>}`
  : Path extends `${infer Start}/[...${infer Param}]${infer Rest}`
    ? Param extends keyof P
      ? P[Param] extends readonly string[]
        ? `${ReplaceDynamicSegments<Start, P>}/${Join<P[Param], "/">}${ReplaceDynamicSegments<Rest, P>}`
        : `${ReplaceDynamicSegments<Start, P>}/[...${Param}]${ReplaceDynamicSegments<Rest, P>}`
      : `${ReplaceDynamicSegments<Start, P>}/[...${Param}]${ReplaceDynamicSegments<Rest, P>}`
    : Path extends `${infer Start}/[${infer Param}]${infer Rest}`
      ? Param extends keyof P
        ? Stringify<P[Param]> extends string
          ? `${Start}/${Stringify<P[Param]>}${ReplaceDynamicSegments<Rest, P>}`
          : `${Start}/[${Param}]${ReplaceDynamicSegments<Rest, P>}`
        : `${Start}/[${Param}]${ReplaceDynamicSegments<Rest, P>}`
      : Path;

type NextPath<
  Routes extends string,
  Path extends string,
  Seg extends string,
> = Path extends ""
  ? `/${GetOriginalSegment<Routes, Path, Seg>}`
  : `${Path}/${GetOriginalSegment<Routes, Path, Seg>}`;

type RouteNode<
  R extends string,
  Path extends string,
  Params extends Record<string, unknown> = {},
  ParamMap extends ParamMapConstraint<R> = {},
  SearchParamMap extends SearchParamMapConstraint<R> = {},
> = {
  getRoute: [keyof Params] extends [never]
    ? <
        const SP extends
          | SearchParamsFor<R, Path extends "" ? "/" : Path, SearchParamMap>
          | undefined = undefined,
      >(
        params?: undefined,
        searchParams?: SP,
      ) => AppendQuery<Path extends "" ? "/" : Path, SP>
    : <
        const P extends Params,
        const SP extends
          | SearchParamsFor<R, Path, SearchParamMap>
          | undefined = undefined,
      >(
        params: P,
        searchParams?: SP,
      ) => AppendQuery<ReplaceDynamicSegments<Path, P>, SP>;
} & {
  [Seg in ChildSegments<R, Path>]: RouteNode<
    R,
    NextPath<R, Path, Seg>,
    IsOptionalCatchAllAtPath<R, Path, Seg> extends true
      ? Params & {
          [K in Seg]?: GetParamType<
            R,
            NextPath<R, Path, Seg>,
            K,
            ParamMap,
            string[]
          >;
        }
      : IsCatchAllAtPath<R, Path, Seg> extends true
        ? Params & {
            [K in Seg]: GetParamType<
              R,
              NextPath<R, Path, Seg>,
              K,
              ParamMap,
              string[]
            >;
          }
        : IsDynamicAtPath<R, Path, Seg> extends true
          ? Params & {
              [K in Seg]: GetParamType<
                R,
                NextPath<R, Path, Seg>,
                K,
                ParamMap,
                string
              >;
            }
          : Params,
    ParamMap,
    SearchParamMap
  >;
};

export type Routes<R extends string, Config = {}> = RouteNode<
  R,
  "",
  {},
  ExtractParamMap<R, Config>,
  ExtractSearchParamMap<R, Config>
>;

function isStandardSchema(
  value: unknown,
): value is StandardSchemaV1<unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "~standard" in value &&
    typeof (value as StandardSchemaV1)["~standard"] === "object"
  );
}

function findMatchingRoute(
  segments: string[],
  schemaMap: Record<string, Record<string, unknown>>,
): string | undefined {
  for (const routePattern of Object.keys(schemaMap)) {
    const patternSegments = routePattern.split("/").filter(Boolean);
    if (patternSegments.length !== segments.length) continue;

    const matches = patternSegments.every((pattern, i) => {
      if (pattern.startsWith("[") && pattern.endsWith("]")) return true;
      if (pattern.startsWith("[[") && pattern.endsWith("]]")) return true;
      return pattern === segments[i];
    });

    if (matches) return routePattern;
  }
  return undefined;
}

function getInheritedParamSchemas(
  segments: string[],
  paramSchemas: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const inherited: Record<string, unknown> = {};

  // Check progressively longer prefixes for matching parent routes
  // Start from 1 segment up to (length - 1) to exclude exact match
  for (let prefixLen = 1; prefixLen < segments.length; prefixLen++) {
    const prefixSegments = segments.slice(0, prefixLen);

    for (const routePattern of Object.keys(paramSchemas)) {
      const patternSegments = routePattern.split("/").filter(Boolean);
      if (patternSegments.length !== prefixLen) continue;

      const matches = patternSegments.every((pattern, j) => {
        if (pattern.startsWith("[") && pattern.endsWith("]")) return true;
        if (pattern.startsWith("[[") && pattern.endsWith("]]")) return true;
        return pattern === prefixSegments[j];
      });

      if (matches) {
        // Later (more specific) parents override earlier ones
        Object.assign(inherited, paramSchemas[routePattern]);
      }
    }
  }

  return inherited;
}

function validateParams(
  params: Record<string, unknown>,
  schemas: Record<string, unknown>,
): Record<string, unknown> {
  const validated: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const schema = schemas[key];
    if (isStandardSchema(schema)) {
      const result = schema["~standard"].validate(value);
      if (result instanceof Promise) {
        throw new Error(`Async validation is not supported for param "${key}"`);
      }
      if (result.issues) {
        throw new Error(
          `Validation failed for param "${key}": ${result.issues[0]?.message}`,
        );
      }
      validated[key] = result.value;
    } else {
      validated[key] = value;
    }
  }
  return validated;
}

function createRoutesWithConfig<
  const R extends string,
  const Config extends RoutesConfigConstraint<R, Config>,
>(config?: Config): Routes<R, Config> {
  const paramSchemas: Record<string, Record<string, unknown>> = {};

  if (config) {
    for (const [route, routeConfig] of Object.entries(config)) {
      const rc = routeConfig as {
        params?: Record<string, unknown>;
        searchParams?: Record<string, unknown>;
      };
      if (rc?.params) {
        paramSchemas[route] = rc.params;
      }
    }
  }

  return createRecursiveProxy(({ path, args }) => {
    const segments = path.slice(0, -1);
    const rawParams = (args[0] ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
    const searchParams = args[1] as Record<string, unknown> | undefined;

    const appendSearchParams = (basePath: string) => {
      if (!searchParams || Object.keys(searchParams).length === 0) {
        return basePath;
      }
      const urlSearchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(searchParams)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            urlSearchParams.append(key, String(v));
          }
        } else {
          urlSearchParams.append(key, String(value));
        }
      }
      const queryString = urlSearchParams.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    };

    if (segments.length === 0) return appendSearchParams("/");

    let params = rawParams;
    if (Object.keys(paramSchemas).length > 0) {
      // Get inherited schemas from parent routes
      const inheritedSchemas = getInheritedParamSchemas(segments, paramSchemas);

      // Get current route's schemas (if any)
      const matchingRoute = findMatchingRoute(segments, paramSchemas);
      const routeSchemas = matchingRoute ? paramSchemas[matchingRoute] ?? {} : {};

      // Route-level schemas override inherited ones
      const mergedSchemas = { ...inheritedSchemas, ...routeSchemas };

      if (Object.keys(mergedSchemas).length > 0) {
        params = validateParams(rawParams, mergedSchemas) as typeof rawParams;
      }
    }

    const resolved = segments.flatMap((seg) => {
      if (!(seg in params)) return seg;
      const value = params[seg];
      if (Array.isArray(value)) return value;
      if (value === undefined) return [];
      return String(value);
    });

    const basePath = resolved.length === 0 ? "/" : `/${resolved.join("/")}`;
    if (!searchParams || Object.keys(searchParams).length === 0) {
      return basePath;
    }

    const urlSearchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const v of value) {
          urlSearchParams.append(key, String(v));
        }
      } else {
        urlSearchParams.append(key, String(value));
      }
    }

    const queryString = urlSearchParams.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }) as Routes<R, Config>;
}

export function createRoutes<const R extends string>(): <
  const Config extends RoutesConfigConstraint<R, Config>,
>(
  config?: Config,
) => Routes<R, Config> {
  return <const Config extends RoutesConfigConstraint<R, Config>>(
    config?: Config,
  ) => createRoutesWithConfig<R, Config>(config);
}
