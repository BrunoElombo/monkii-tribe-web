/** The signed-in session (auth service). */

export interface SessionUser {
  id: string;
  email: string;
  accountType: "LISTENER" | "ARTIST" | "MANAGER" | "LABEL";
  isAdmin: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}
