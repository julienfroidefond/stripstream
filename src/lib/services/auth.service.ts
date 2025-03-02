"use client";

import type { AppErrorType } from "@/types/global";
import { ERROR_CODES } from "@/constants/errorCodes";

class AuthService {
  private static instance: AuthService;

  // Constructeur privé pour le pattern Singleton
  private constructor() {
    // Pas d'initialisation nécessaire
  }

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
    } catch (error) {
      if ((error as AppErrorType).code) {
        throw error;
      }
      throw {
        code: ERROR_CODES.AUTH.INVALID_CREDENTIALS,
        name: "Invalid credentials",
        message: "The email or password is incorrect",
      } as AppErrorType;
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
    } catch (error) {
      if ((error as AppErrorType).code) {
        throw error;
      }
      throw {
        code: ERROR_CODES.AUTH.INVALID_USER_DATA,
        name: "Invalid user data",
        message: "The email or password is incorrect",
      } as AppErrorType;
    }
  }

  /**
   * Déconnecte l'utilisateur
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw data.error;
      }
    } catch (error) {
      if ((error as AppErrorType).code) {
        throw error;
      }
      throw {
        code: ERROR_CODES.AUTH.LOGOUT_ERROR,
        name: "Logout error",
        message: "The logout failed",
      } as AppErrorType;
    }
  }
}

export const authService = AuthService.getInstance();
