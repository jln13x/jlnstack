import { createFlagsHandler } from "@jlnstack/flags/next";
import { flags } from "@/lib/flags";

export const { GET, POST, OPTIONS } = createFlagsHandler(flags, {
  secret: "2a56a6588355a0484c3149a6eb91a15060bc35813c62c585",
});
