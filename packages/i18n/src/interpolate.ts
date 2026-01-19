/**
 * Interpolate variables into a translation string.
 * Replaces {var} patterns with values from the vars object.
 *
 * @example
 * ```ts
 * interpolate("Hello, {name}!", { name: "World" });
 * // => "Hello, World!"
 *
 * interpolate("You have {count} messages", { count: 5 });
 * // => "You have 5 messages"
 * ```
 */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in vars) {
      return String(vars[key]);
    }
    return match;
  });
}
