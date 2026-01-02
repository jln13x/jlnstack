import { createRecursiveProxy } from "./proxy";

type ValidParamValue =
  | string
  | number
  | boolean
  | bigint
  | string[]
  | readonly string[];

type ParamMapConstraint<Routes extends string> = {
  [K in Routes]?: Record<string, ValidParamValue>;
};

type FindParamInMap<
  Routes extends string,
  CurrentPath extends string,
  ParamName extends string,
  ParamMap extends ParamMapConstraint<Routes>,
> = {
  [R in Routes]: R extends `${CurrentPath}${"" | `/${string}`}`
    ? R extends keyof ParamMap
      ? ParamName extends keyof NonNullable<ParamMap[R]>
        ? NonNullable<ParamMap[R]>[ParamName]
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

export function createRoutes<
  const Routes extends string,
  ParamMap extends ParamMapConstraint<Routes> = {},
>() {
  return createRecursiveProxy(({ path, args }) => {
    const segments = path.slice(0, -1);
    const params = (args[0] ?? {}) as Record<
      string,
      string | string[] | undefined
    >;

    if (segments.length === 0) return "/";

    const resolved = segments.flatMap((seg) => {
      if (!(seg in params)) return seg;
      const value = params[seg];
      if (Array.isArray(value)) return value;
      if (value === undefined) return [];
      return value;
    });

    return resolved.length === 0 ? "/" : `/${resolved.join("/")}`;
  }) as RouteNode<Routes, "", {}, ParamMap>;
}
