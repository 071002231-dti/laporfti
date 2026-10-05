import jwt from "jsonwebtoken";
import type { Division } from "../../src/lib/divisions";

export type AdminRole = "SUPER_ADMIN" | "MODERATOR" | "PIMPINAN" | "STAFF";

// role is optional: any logged-in UII account (student or staff) gets a
// session so they can use the app, but only accounts registered in
// admin_users carry a role and get admin capabilities.
export interface AdminSession {
  email: string;
  name?: string;
  role?: AdminRole;
  division?: Division;
  // Seconds-since-epoch the token was issued (standard JWT "iat" claim),
  // used to check the token against admin_users.session_revoked_at.
  iat?: number;
  // Set only on an impersonation session: the Super Admin's own email, so
  // end-impersonation can restore their identity without a session store.
  impersonatedBy?: string;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  return secret;
}

export function signAdminSession(payload: AdminSession, options?: { maxAgeHours?: number }): string {
  const maxAgeHours = options?.maxAgeHours ?? (Number(process.env.SESSION_MAX_AGE_HOURS) || 12);
  return jwt.sign(payload, getSecret(), { expiresIn: `${maxAgeHours}h` });
}

export function verifyAdminSession(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "object" && decoded && "email" in decoded) {
      return {
        email: String(decoded.email),
        name: (decoded as { name?: string }).name,
        role: (decoded as { role?: AdminRole }).role,
        division: (decoded as { division?: Division }).division,
        iat: (decoded as { iat?: number }).iat,
        impersonatedBy: (decoded as { impersonatedBy?: string }).impersonatedBy,
      };
    }
    return null;
  } catch {
    return null;
  }
}
