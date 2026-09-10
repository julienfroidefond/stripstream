/**
 * Convertit le `community_score` renvoyé par l'API Stripstream (échelle 0-5,
 * moyenne des providers approuvés) vers l'échelle /10 utilisée sur la page série.
 *
 * Formule API : `community_score = AVG(provider_rating / provider_rating_scale * 5)`
 * → `community_score * 2` équivaut à la moyenne des notes providers sur /10.
 *
 * Renvoie `null` quand la série n'a aucune note.
 */
export function communityScoreToTen(score?: number | null): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return score * 2;
}
