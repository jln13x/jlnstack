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

type ExtractParamType<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T;

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

type GetParamType<
  Routes extends string,
  CurrentPath extends string,
  ParamName extends string,
  ParamMap extends ParamMapConstraint<Routes>,
  DefaultType,
> = [FindParamInMap<Routes, CurrentPath, ParamName, ParamMap>] extends [never]
  ? DefaultType
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

export type RouteNode<
  Routes extends string,
  Path extends string,
  Params extends Record<string, unknown> = {},
  ParamMap extends ParamMapConstraint<Routes> = {},
> = {
  getRoute: [keyof Params] extends [never]
    ? () => Path extends "" ? "/" : Path
    : <const P extends Params>(params: P) => ReplaceDynamicSegments<Path, P>;
} & {
  [Seg in ChildSegments<Routes, Path>]: RouteNode<
    Routes,
    NextPath<Routes, Path, Seg>,
    IsOptionalCatchAllAtPath<Routes, Path, Seg> extends true
      ? Params & {
          [K in Seg]?: GetParamType<
            Routes,
            NextPath<Routes, Path, Seg>,
            K,
            ParamMap,
            string[]
          >;
        }
      : IsCatchAllAtPath<Routes, Path, Seg> extends true
        ? Params & {
            [K in Seg]: GetParamType<
              Routes,
              NextPath<Routes, Path, Seg>,
              K,
              ParamMap,
              string[]
            >;
          }
        : IsDynamicAtPath<Routes, Path, Seg> extends true
          ? Params & {
              [K in Seg]: GetParamType<
                Routes,
                NextPath<Routes, Path, Seg>,
                K,
                ParamMap,
                string
              >;
            }
          : Params,
    ParamMap
  >;
};

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

export function createRoutes<const Routes extends string>(): RouteNode<
  Routes,
  "",
  {},
  {}
>;
export function createRoutes<
  const Routes extends string,
  ParamMap extends ParamMapConstraint<Routes>,
>(): RouteNode<Routes, "", {}, ParamMap>;
export function createRoutes<
  const ParamMap extends ParamMapConstraint<string>,
  Routes extends string = Extract<keyof ParamMap, string>,
>(schemaMap: ParamMap): RouteNode<Routes, "", {}, ParamMap>;
export function createRoutes<
  const Routes extends string,
  ParamMap extends ParamMapConstraint<Routes> = {},
>(schemaMap?: ParamMap) {
  return createRecursiveProxy(({ path, args }) => {
    const segments = path.slice(0, -1);
    const rawParams = (args[0] ?? {}) as Record<
      string,
      string | string[] | undefined
    >;

    if (segments.length === 0) return "/";

    let params = rawParams;
    if (schemaMap) {
      const matchingRoute = findMatchingRoute(
        segments,
        schemaMap as Record<string, Record<string, unknown>>,
      );
      if (matchingRoute && matchingRoute in schemaMap) {
        const routeSchemas = schemaMap[
          matchingRoute as keyof typeof schemaMap
        ] as Record<string, unknown>;
        params = validateParams(rawParams, routeSchemas) as typeof rawParams;
      }
    }

    const resolved = segments.flatMap((seg) => {
      if (!(seg in params)) return seg;
      const value = params[seg];
      if (Array.isArray(value)) return value;
      if (value === undefined) return [];
      return String(value);
    });

    return resolved.length === 0 ? "/" : `/${resolved.join("/")}`;
  }) as RouteNode<Routes, "", {}, ParamMap>;
}
