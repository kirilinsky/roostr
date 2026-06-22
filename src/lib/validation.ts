// Shared, framework-agnostic text-input validation. Pure (no React/DB), so the
// SAME rule runs client-side (instant feedback before submit) AND server-side
// (never trust the client) — call validateText in the form and again in the
// server action. Reuse for any free-text field (nickname now, bios/notes later).

export type TextErrorCode =
  | "required"
  | "tooShort"
  | "tooLong"
  | "pattern"
  | "unsafe";

export interface TextRule {
  trim?: boolean; // trim surrounding whitespace first (default true)
  min?: number; // min length after trim
  max?: number; // max length after trim
  pattern?: RegExp; // must match (tested on the trimmed value)
  allowEmpty?: boolean; // empty is valid → resolves to null (e.g. "clear the field")
  allowHtml?: boolean; // opt OUT of the XSS guard (default: guard ON)
}

export type TextValidation =
  | { ok: true; value: string | null } // sanitized value (null = empty + allowEmpty)
  | { ok: false; code: TextErrorCode };

// --- XSS guard ---
// Non-printable / control chars (U+0000-001F plus U+007F DEL). Normal whitespace
// (space, \t, \n) is fine; these have no business in a text field and can smuggle
// payloads past naive filters.
// eslint-disable-next-line no-control-regex -- intentional: this IS the XSS guard
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
// Characters that start HTML/script injection. We REJECT (not strip) so the user
// sees what's wrong and the stored value is provably free of markup. React
// already escapes on render — this is defense-in-depth for any NON-React sink
// later (SVG, attributes, emails, Telegram messages, raw API responses).
const HTML_UNSAFE = /[<>&"'`]/;

// True if `value` carries control chars or HTML/script-injection characters.
export function isUnsafeText(value: string): boolean {
  return CONTROL_CHARS.test(value) || HTML_UNSAFE.test(value);
}

// HTML-escape a string for safe interpolation into a non-React HTML sink. Use
// when you must build markup/attributes by hand (validateText rejects these chars
// at input, but escape at the sink too — belt and braces).
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

// Validate + sanitize a raw string against a rule. On success returns the cleaned
// value (trimmed; null when blank and allowEmpty). On failure returns an error
// code the caller maps to a localized message (i18n `validation.<code>`). The XSS
// guard runs by default — pass allowHtml:true only for fields that truly need it.
export function validateText(raw: string, rule: TextRule = {}): TextValidation {
  const value = rule.trim === false ? raw : raw.trim();

  if (value.length === 0) {
    return rule.allowEmpty
      ? { ok: true, value: null }
      : { ok: false, code: "required" };
  }
  if (!rule.allowHtml && isUnsafeText(value)) {
    return { ok: false, code: "unsafe" };
  }
  if (rule.min != null && value.length < rule.min) {
    return { ok: false, code: "tooShort" };
  }
  if (rule.max != null && value.length > rule.max) {
    return { ok: false, code: "tooLong" };
  }
  if (rule.pattern && !rule.pattern.test(value)) {
    return { ok: false, code: "pattern" };
  }
  return { ok: true, value };
}

// The rule for a roostr custom nickname — shared by the form and the action so
// they can never drift. (NICKNAME_MAX lives in lib/roostr.)
import { NICKNAME_MAX } from "@/lib/roostr";
export const NICKNAME_RULE: TextRule = {
  trim: true,
  max: NICKNAME_MAX,
  allowEmpty: false, // a save must be non-empty; clearing goes via clearNicknameAction
  // allowHtml stays false → XSS guard on.
};
