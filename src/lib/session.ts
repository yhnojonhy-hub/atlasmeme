import { cookies, headers } from "next/headers";
import { authEnabled, COOKIE, readSessionToken, sessionFromRequest, tokenMatches, type Session } from "./auth";
import { getUser, type PublicUser } from "./users";

/** Sessão para rotas de API, confirmada contra users.json (usuário existe; papel atual). */
export async function apiSession(req: Request): Promise<Session | null> {
  const s = sessionFromRequest(req);
  if (!s) return null;
  if (s.via !== "cookie") return s;
  const u = await getUser(s.uid);
  return u ? { ...s, role: u.role } : null;
}

/** Sessão + usuário atual para componentes de servidor (verificação autoritativa). */
export async function currentUser(): Promise<{ session: Session; user: PublicUser | null } | null> {
  if (!authEnabled()) return { session: { uid: "local", role: "admin", exp: Infinity, via: "token" }, user: null };
  if (tokenMatches((await headers()).get("x-farol-token"))) return { session: { uid: "script", role: "admin", exp: Infinity, via: "token" }, user: null };
  const token = (await cookies()).get(COOKIE)?.value;
  const session = readSessionToken(token);
  if (!session) return null;
  const user = await getUser(session.uid);
  if (!user) return null;
  return { session: { ...session, role: user.role }, user };
}
