"use client";

import { createContext, useContext } from "react";

/**
 * Contexte de navigation fourni par Sidebar. Les sections streamées
 * (favoris, bibliothèques) sont rendues dans des slots serveur mais ont
 * besoin du handler de navigation du Sidebar (client) pour router.push
 * + fermeture. Le contexte permet de le passer sans percer l'isolation
 * client/serveur.
 */
export type SidebarNavHandler = (path: string) => Promise<void> | void;

export const SidebarNavContext = createContext<SidebarNavHandler>(() => undefined);

export function useSidebarNav(): SidebarNavHandler {
  return useContext(SidebarNavContext);
}
