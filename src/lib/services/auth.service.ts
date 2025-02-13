import { AuthError } from "@/types/auth";
import { storageService } from "./storage.service";

interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

// Utilisateur de développement
const DEV_USER = {
  email: "demo@stripstream.local",
  password: "demo123",
  userData: {
    id: "1",
    email: "demo@stripstream.local",
    roles: ["ROLE_USER"],
    authenticated: true,
  } as AuthUser,
};

class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authentifie un utilisateur
   */
  async login(email: string, password: string, remember: boolean = false): Promise<void> {
    // En développement, on vérifie juste l'utilisateur de démo
    if (email === DEV_USER.email && password === DEV_USER.password) {
      storageService.setUserData(DEV_USER.userData, remember);
      return;
    }

    throw {
      code: "INVALID_CREDENTIALS",
      message: "Email ou mot de passe incorrect",
    } as AuthError;
  }

  /**
   * Déconnecte l'utilisateur
   */
  logout(): void {
    storageService.clear();
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    const user = storageService.getUserData<AuthUser>();
    return !!user?.authenticated;
  }

  /**
   * Récupère l'utilisateur connecté
   */
  getCurrentUser(): AuthUser | null {
    return storageService.getUserData<AuthUser>();
  }
}

export const authService = AuthService.getInstance();
