export interface Connection {
  endpoint: string;
  secret: string;
}

export function generateSecret(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
