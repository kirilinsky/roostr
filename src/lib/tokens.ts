// Design-system raw tokens shared by the theme and `sx`. Kept in a plain (non
// "use client") module so server components can import the values too.
// Extend here, don't inline ad-hoc values in `sx`.

// Monospace stack for ids, gene codes and stat numbers.
export const MONO_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

// Fallback avatar for users with no Telegram photo. `userPhoto` resolves any
// nullable photo url to a real src (never undefined) so every user avatar shows
// this house image instead of a bare initial. Lives in /public.
export const ANON_AVATAR = "/anon.png";
export function userPhoto(photoUrl?: string | null): string {
  return photoUrl || ANON_AVATAR;
}
