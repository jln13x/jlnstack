import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Flags } from "../index";

export interface FlagsHandlerConfig {
  secret: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function createFlagsHandler<
  const TFlags extends readonly string[],
  TContext = undefined,
>(flags: Flags<TFlags, TContext>, config: FlagsHandlerConfig) {
  type FlagName = TFlags[number];
  const { secret } = config;

  function checkAuth(request: NextRequest): boolean {
    const auth = request.headers.get("authorization");
    return auth === `Bearer ${secret}`;
  }

  function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  async function GET(request: NextRequest) {
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    const contextParam = request.nextUrl.searchParams.get("context");
    const context = contextParam ? JSON.parse(contextParam) : undefined;

    const values = await (flags.getAll as (ctx?: unknown) => Promise<unknown>)(
      context,
    );

    return NextResponse.json(
      {
        definitions: flags.definitions,
        values,
      },
      { headers: corsHeaders },
    );
  }

  async function POST(request: NextRequest) {
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      );
    }

    if (!flags.set) {
      return NextResponse.json(
        { error: "Adapter does not support setting flags" },
        { status: 501, headers: corsHeaders },
      );
    }

    const body = (await request.json()) as { flag: FlagName; value: boolean };
    const { flag, value } = body;

    if (typeof flag !== "string" || typeof value !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: corsHeaders },
      );
    }

    await flags.set(flag, value);
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  }

  return { GET, POST, OPTIONS };
}
