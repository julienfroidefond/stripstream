"use client";

import { useState, useEffect, useRef } from "react";
import type { KomgaBook } from "@/types/komga";

interface EpubPositionManagerProps {
  book: KomgaBook;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPositionsLoaded?: (positions: any[]) => void;
}

export function useEpubPositions({
  book,
  isLoading,
  currentPage,
  totalPages,
}: EpubPositionManagerProps) {
  const [positions, setPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const lastPercentageRef = useRef<number | null>(null);

  // Récupérer les positions du livre EPUB
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        // Si les positions sont déjà chargées, ne pas les recharger
        if (positions.length > 0) {
          console.log("Positions déjà chargées, pas besoin de les récupérer à nouveau");
          return;
        }

        setIsLoadingPositions(true);
        console.log("Chargement des positions EPUB...");

        // Récupérer les positions du livre EPUB
        const response = await fetch(`/api/komga/books/${book.id}/positions`, {
          headers: {
            Accept: "application/vnd.readium.position-list+json",
          },
          // Désactiver le cache pour éviter les problèmes avec le rechargement à chaud
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Vérifier que les positions sont bien dans le champ "positions" et que c'est un tableau
        if (data && data.positions && Array.isArray(data.positions) && data.positions.length > 0) {
          console.log(`Positions EPUB récupérées: ${data.positions.length} positions`);
          // Trier les positions par totalProgression pour s'assurer qu'elles sont dans le bon ordre
          const sortedPositions = [...data.positions].sort(
            (a, b) => a.locations.totalProgression - b.locations.totalProgression
          );
          setPositions(sortedPositions);
          console.log("Positions triées et stockées dans l'état");
        } else {
          console.warn("Aucune position trouvée pour ce livre EPUB", data);
          setPositions([]);
        }

        setIsLoadingPositions(false);
      } catch (err) {
        console.error("Erreur lors de la récupération des positions:", err);
        setIsLoadingPositions(false);
        setPositions([]);
      }
    };

    if (!isLoading && book.media.mediaProfile === "EPUB") {
      fetchPositions();
    }

    // Fonction pour recharger les positions en cas de besoin
    const reloadPositionsIfNeeded = () => {
      if (
        positions.length === 0 &&
        !isLoadingPositions &&
        !isLoading &&
        book.media.mediaProfile === "EPUB"
      ) {
        console.log("Rechargement des positions car elles semblent avoir été perdues");
        fetchPositions();
      }
    };

    // Vérifier périodiquement si les positions doivent être rechargées
    const intervalId = setInterval(reloadPositionsIfNeeded, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [book.id, book.media.mediaProfile, isLoading, positions.length, isLoadingPositions]);

  // Fonction pour mettre à jour la progression de lecture
  const updateReadProgress = async (percentageOrLocation: number | any) => {
    try {
      // Vérifier si nous avons reçu un objet de position ou un pourcentage
      const isLocationObject =
        typeof percentageOrLocation === "object" && percentageOrLocation !== null;

      console.log(
        isLocationObject
          ? "updateReadProgress appelé avec objet de position:"
          : "updateReadProgress appelé avec pourcentage:",
        percentageOrLocation
      );

      console.log(
        "État actuel des positions:",
        positions.length > 0
          ? `${positions.length} positions disponibles`
          : "aucune position disponible"
      );

      // Si nous avons reçu un objet de position directement
      if (isLocationObject) {
        const locationInfo = percentageOrLocation;

        // Si aucune position n'est disponible, stocker l'objet de position et sortir
        if (!positions || positions.length === 0) {
          console.warn("Aucune position disponible pour mettre à jour la progression");
          // Stocker le pourcentage calculé à partir de l'index pour une mise à jour ultérieure
          const calculatedPercentage = (locationInfo.index / totalPages) * 100;
          lastPercentageRef.current = calculatedPercentage;
          console.log(
            "Pourcentage calculé stocké pour mise à jour ultérieure:",
            calculatedPercentage
          );
          return;
        }

        // Rechercher une position avec le même href
        let matchedPosition = null;
        for (const position of positions) {
          console.log("position.href:", position.href);
          console.log("locationInfo.href:", locationInfo.href);
          if (`${position.href}` === `OEBPS/${locationInfo.href}`) {
            matchedPosition = position;
            console.log("Position avec le même href trouvée:", position);
            break;
          }
        }

        // Si aucune position avec le même href n'est trouvée, utiliser la méthode par pourcentage
        if (!matchedPosition) {
          console.log(
            "Aucune position avec le même href trouvée, utilisation de la méthode par pourcentage"
          );
          // Ne pas utiliser locationInfo.percentage car il est toujours à 0
          // Calculer le pourcentage à partir de l'index
          const progressionDecimal = locationInfo.index / totalPages;

          // Trouver la position la plus proche du pourcentage actuel
          let closestPosition = positions[0];
          let minDifference = Math.abs(
            positions[0].locations.totalProgression - progressionDecimal
          );

          for (let i = 1; i < positions.length; i++) {
            const position = positions[i];
            const difference = Math.abs(position.locations.totalProgression - progressionDecimal);

            if (difference < minDifference) {
              minDifference = difference;
              closestPosition = position;
            }
          }

          matchedPosition = closestPosition;
          console.log("Position la plus proche trouvée:", matchedPosition);
          console.log("Différence de progression:", minDifference);
        }

        // Date actuelle au format ISO
        const now = new Date().toISOString();

        // Créer l'objet de progression de lecture avec les informations de position trouvées
        const progressData = {
          device: {
            id: "unused",
            name: "StripStream Web Reader",
          },
          locator: matchedPosition,
          modified: now,
        };

        console.log("Envoi de la progression de lecture avec position matchée:", progressData);

        // Envoyer la progression
        const response = await fetch(`/api/komga/books/${book.id}/progression`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(progressData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erreur API:", response.status, errorText);
          throw new Error(`Erreur API: ${response.status} ${errorText}`);
        }

        console.log("Progression de lecture mise à jour avec succès");
        return;
      }

      // Traitement classique avec pourcentage
      const percentage = percentageOrLocation as number;

      // Si aucune position n'est disponible, stocker le pourcentage et sortir
      if (!positions || positions.length === 0) {
        console.warn("Aucune position disponible pour mettre à jour la progression");
        lastPercentageRef.current = percentage;
        console.log("Pourcentage stocké pour mise à jour ultérieure:", percentage);
        return;
      }

      // Convertir le pourcentage en valeur décimale (0-1)
      const progressionDecimal = percentage / 100;

      // Trouver la position la plus proche du pourcentage actuel en utilisant locations.totalProgression
      let closestPosition = positions[0];
      let minDifference = Math.abs(positions[0].locations.totalProgression - progressionDecimal);

      for (let i = 1; i < positions.length; i++) {
        const position = positions[i];
        const difference = Math.abs(position.locations.totalProgression - progressionDecimal);

        if (difference < minDifference) {
          minDifference = difference;
          closestPosition = position;
        }
      }

      console.log("progressionDecimal:", progressionDecimal);
      console.log("Position la plus proche trouvée:", closestPosition);
      console.log("Différence de progression:", minDifference);

      // Date actuelle au format ISO
      const now = new Date().toISOString();

      // Créer l'objet de progression de lecture selon le format exact qui fonctionne
      const progressData = {
        device: {
          id: "unused",
          name: "StripStream Web Reader",
        },
        locator: closestPosition,
        modified: now,
      };

      console.log("Envoi de la progression de lecture:", progressData);

      // Utiliser l'endpoint correct pour la progression de lecture des EPUB
      const response = await fetch(`/api/komga/books/${book.id}/progression`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(progressData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erreur API:", response.status, errorText);
        throw new Error(`Erreur API: ${response.status} ${errorText}`);
      }

      console.log("Progression de lecture mise à jour avec succès");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la progression:", error);
      // Stocker le pourcentage en cas d'erreur pour réessayer plus tard
      if (typeof percentageOrLocation === "number") {
        lastPercentageRef.current = percentageOrLocation;
      }
    }
  };

  // Effet pour mettre à jour la progression lorsque les positions sont chargées
  useEffect(() => {
    // Si nous avons des positions et un pourcentage en attente, mettre à jour la progression
    if (positions && positions.length > 0 && lastPercentageRef.current !== null && !isLoading) {
      console.log(
        "Positions chargées, mise à jour de la progression en attente avec pourcentage:",
        lastPercentageRef.current
      );
      updateReadProgress(lastPercentageRef.current);
      // Réinitialiser le pourcentage en attente après l'avoir traité
      lastPercentageRef.current = null;
    }
  }, [positions, isLoadingPositions, isLoading]);

  // Fonction pour gérer l'événement relocated
  const handleRelocated = (locationInfo: any) => {
    if (locationInfo && locationInfo.start) {
      console.log("Relocated event - locationInfo.start:", locationInfo.start);

      console.log(
        "Relocated event - Positions disponibles:",
        positions.length > 0,
        "Nombre de positions:",
        positions.length
      );

      // Mettre à jour la progression de lecture seulement si les positions sont chargées
      if (positions && positions.length > 0) {
        console.log("Mise à jour de la progression avec objet de position");
        updateReadProgress(locationInfo.start);
      } else {
        console.warn("Impossible de mettre à jour la progression: positions non chargées");
        // Stocker le pourcentage pour une mise à jour ultérieure
        const percentage = Math.round(((locationInfo.start.index + 1) / totalPages) * 100);
        lastPercentageRef.current = percentage;
        console.log("Pourcentage stocké pour mise à jour ultérieure:", percentage);
      }
    }
  };

  return {
    positions,
    isLoadingPositions,
    updateReadProgress,
    handleRelocated,
    lastPercentageRef,
  };
}
