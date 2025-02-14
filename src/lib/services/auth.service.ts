"use client";

import { AuthError } from "@/types/auth";
import { storageService } from "./storage.service";

interface AuthUser {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}
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
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, remember }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw data.error;
      }

      const data = await response.json();
      if (data.user) {
        storageService.setUserData(data.user, remember);
      }
    } catch (error) {
      if ((error as AuthError).code) {
        throw error;
      }
      throw {
        code: "SERVER_ERROR",
        message: "Une erreur est survenue lors de la connexion",
      } as AuthError;
    }
  }

  /**
   * Crée un nouvel utilisateur
   */
  async register(email: string, password: string): Promise<void> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw data.error;
      }

      const data = await response.json();
      if (data.user) {
        storageService.setUserData(data.user, false);
      }
    } catch (error) {
      if ((error as AuthError).code) {
        throw error;
      }
      throw {
        code: "SERVER_ERROR",
        message: "Une erreur est survenue lors de l'inscription",
      } as AuthError;
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  async logout(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      storageService.clear();
    }
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
