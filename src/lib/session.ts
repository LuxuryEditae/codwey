const KEY = "codwey-session";

export function sessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function newSession(): string {
  if (typeof window === "undefined") return "";
  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  return id;
}
