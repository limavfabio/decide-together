const cookieName = "decision_voter_id";
const oneYear = 60 * 60 * 24 * 365;

export function getVoterId(request: Request) {
  const cookie = request.headers.get("Cookie");

  if (!cookie) {
    return null;
  }

  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  return value ? decodeURIComponent(value) : null;
}

export function ensureVoterId(request: Request) {
  return getVoterId(request) ?? crypto.randomUUID();
}

export function voterCookieHeader(voterId: string) {
  return [
    `${cookieName}=${encodeURIComponent(voterId)}`,
    "Path=/",
    `Max-Age=${oneYear}`,
    "SameSite=Lax",
    "HttpOnly",
  ].join("; ");
}
