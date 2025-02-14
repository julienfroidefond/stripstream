import { KomgaUser } from "./komga";

export interface AuthConfig {
  serverUrl: string;
  credentials: {
    username: string;
    password: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: KomgaUser | null;
  serverUrl: string | null;
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

export type AuthErrorCode = "INVALID_CREDENTIALS" | "SERVER_ERROR" | "EMAIL_EXISTS";
