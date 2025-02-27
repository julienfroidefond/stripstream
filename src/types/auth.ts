import { KomgaUser } from "./komga";
import { ErrorCode } from "@/constants/errorCodes";

export interface AuthConfig {
  serverUrl: string;
  authHeader: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: KomgaUser | null;
  serverUrl: string | null;
}

export interface AuthError {
  code: ErrorCode;
}

// Deprecated - Use ErrorCode from @/constants/errorCodes instead
export type AuthErrorCode = ErrorCode;
