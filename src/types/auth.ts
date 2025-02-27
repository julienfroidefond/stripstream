import { KomgaUser } from "./komga";

export interface AuthConfig {
  serverUrl: string;
  authHeader: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: KomgaUser | null;
  serverUrl: string | null;
}
