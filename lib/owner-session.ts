// Client-side check: does this device hold an owner (Supabase auth) session?
// @supabase/ssr stores the session in non-httpOnly cookies named
// sb-<project-ref>-auth-token (possibly chunked), so presence = signed in.
export function hasOwnerSession(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(
      "."
    )[0];
    return document.cookie.includes(`sb-${ref}-auth-token`);
  } catch {
    return false;
  }
}
