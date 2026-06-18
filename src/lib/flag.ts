// ISO 3166-1 alpha-2 country code -> emoji flag (regional indicator pair).
// Used for breed origin / future country championships.
export function countryFlag(iso: string): string {
  if (!iso || iso.length !== 2) return "";
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
