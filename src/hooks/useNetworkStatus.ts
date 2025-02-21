"use client";

import { useState, useEffect } from "react";

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Fonction pour mettre à jour l'état
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // État initial
    setIsOnline(navigator.onLine);

    // Écouter les changements d'état de la connexion
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Nettoyage
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return isOnline;
};
