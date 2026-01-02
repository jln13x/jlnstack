import { createRecursiveProxy } from "./proxy";

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

type ReplaceDynamicSegments<
  Path extends string,
  P extends Record<string, string | string[] | undefined>,
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
        ? P[Param] extends string
          ? `${Start}/${P[Param]}${ReplaceDynamicSegments<Rest, P>}`
          : `${Start}/[${Param}]${ReplaceDynamicSegments<Rest, P>}`
        : `${Start}/[${Param}]${ReplaceDynamicSegments<Rest, P>}`
      : Path;

export type RouteNode<
  Routes extends string,
  Path extends string,
  Params extends Record<string, string | string[]> = {},
> = {
  getRoute: [keyof Params] extends [never]
    ? () => Path extends "" ? "/" : Path
    : <const P extends Params>(params: P) => ReplaceDynamicSegments<Path, P>;
} & {
  [Seg in ChildSegments<Routes, Path>]: RouteNode<
    Routes,
    Path extends ""
      ? `/${GetOriginalSegment<Routes, Path, Seg>}`
      : `${Path}/${GetOriginalSegment<Routes, Path, Seg>}`,
    IsOptionalCatchAllAtPath<Routes, Path, Seg> extends true
      ? Params & { [K in Seg]?: string[] }
      : IsCatchAllAtPath<Routes, Path, Seg> extends true
        ? Params & { [K in Seg]: string[] }
        : IsDynamicAtPath<Routes, Path, Seg> extends true
          ? Params & { [K in Seg]: string }
          : Params
  >;
};

export function createRoutes<Routes extends string>() {
  return createRecursiveProxy(({ path, args }) => {
    const segments = path.slice(0, -1);
    const params = (args[0] ?? {}) as Record<
      string,
      string | string[] | undefined
    >;

    if (segments.length === 0) return "/";

    const resolved = segments.flatMap((seg) => {
      const value = params[seg];
      if (Array.isArray(value)) return value;
      if (value === undefined) return [];
      return value ?? seg;
    });

    return resolved.length === 0 ? "/" : `/${resolved.join("/")}`;
  }) as RouteNode<Routes, "", {}>;
}
