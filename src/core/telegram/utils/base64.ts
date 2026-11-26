export function encode(data: Uint8Array): string {
  return btoa(Array.from(data, c => String.fromCharCode(c)).join(''));
}
export function decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}
