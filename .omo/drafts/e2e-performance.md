---
slug: e2e-performance
status: approved
intent: unclear
review_required: true
plan_path: .omo/plans/e2e-performance.md
plan_sha256: null
review_round_id: null
pending-action: write and review .omo/plans/e2e-performance.md
review:
  momus:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/e2e-performance.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
  independent:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/e2e-performance.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
approach: >
  Réduire le temps d'exécution E2E sans changer la couverture, par cinq leviers
  ordonnés par impact : (1) lancer l'app sous build de production plutôt que
  `next dev`, (2) authentifier une fois via un setup project + storageState,
  (3) paralléliser en séparant specs read-only et mutating, (4) supprimer les
  attentes dures (waitForTimeout / networkidle), (5) hygiène (déduplication
  signIn, DB mortes). Toutes les décisions sont réversibles et chiffrées par un
  avant/après mesuré.
---

# Draft: e2e-performance

> Note d'exécution : l'outil shell n'est pas disponible dans cette session, donc
> `scripts/scaffold-plan.mjs` n'a pas pu être lancé ; ce fichier reproduit sa
> structure `buildDraft()` à l'identique. Le plan skeleton sera émis après accord,
> de la même manière.

## Components (topology ledger)
<!-- id | outcome (one line) | status | evidence path -->
- C1 | Serveur E2E servi en mode production (build + start) au lieu de `next dev` | active | playwright.config.ts:43
- C2 | Authentification réutilisée via setup project + `storageState` (1 login par rôle au lieu de ~30) | active | tests/helpers/auth.ts:9, playwright.config.ts:31
- C3 | Parallélisation sûre : workers > 1 + séparation read-only / mutating, isolation par worker | active | playwright.config.ts:24,27
- C4 | Attentes déterministes : plus de `waitForTimeout` ni `networkidle` | active | tests/public/security.spec.ts:58,67 ; tests/public/responsive.spec.ts:12,27
- C5 | Hygiène suite : `signIn` dédupliqué, config morte retirée, DB obsolètes supprimées | active | 6 copies locales de signIn ; prisma/e2e.db (non référencé)
- C6 | Preuve de gain : mesure avant/après + contrôle anti-flake | active | à produire sous .omo/evidence/

## Open assumptions (announced defaults)
<!-- Intent is UNCLEAR: research resolves ambiguity, defaults are adopted (not asked), and each is surfaced in the plan's human TL;DR for veto. -->
<!-- assumption | adopted default | rationale | reversible? -->
- Mode serveur | Build production (`next build` puis `next start`), build dans une étape npm séparée AVANT Playwright, dist dir isolé `.next-e2e`, GATE par spike tâche 2, repli `next dev` si échec | Recommandation officielle Next.js + Playwright ; le webServer démarre AVANT globalSetup, donc pas de build dans le webServer | Oui
- Auth | Setup project écrit `tests/.auth/stream.json` et `tests/.auth/reader.json` via `storageState` ; login UI brut conservé uniquement pour authentication/session/signout | Pattern officiel recommandé ; supprime ~30 logins UI | Oui
- Parallélisme | Opt-in : `workers: 1` par défaut, `E2E_PARALLEL=1` uniquement pour le run read-only ; mutating dans une 2ᵉ invocation séparée | `workers: 1` actuel est imposé par le compte partagé (config:21-27) ; deux invocations obligatoires car Playwright n'a pas de workers par projet | Oui
- Attentes | Remplacer chaque `waitForTimeout` par assertions web-first / `expect.poll` / `page.waitForResponse` ; remplacer `networkidle` par un locator ou une réponse concrète | Officiellement découragés et flaky | Oui
- Retries / traces | Conserver `retries: CI ? 2 : 0`, `trace: 'on-first-retry'`, `screenshot/video` failure-only | Déjà optimal ; `trace: 'on'` serait un ralentissement | Oui
- Héritage helpers | Fusionner les 6 copies locales de `signIn` dans `tests/helpers/auth.ts` | DRY, une seule source de vérité | Oui
- Redémarrage serveur | `reuseExistingServer` passe à `!process.env.CI && process.env.E2E_REUSE_SERVER === '1'` | Évite le boot (jusqu'à 120 s) lors des relances locales | Oui
- Config morte | `E2E_TEST_MODE=1` injecté mais non référencé sous `src/` ; à retirer si un scan confirme l'absence d'usage | Supprime une fausse promesse | Oui
- Fichiers DB | Supprimer `prisma/e2e.db` et `prisma/e2e-runtime.db` (référencés nulle part) | Artefacts obsolètes | Oui
- CI | Hors périmètre : ajouter un job E2E n'est pas une optimisation de vitesse | Garde-fou de scope | n/a

## Findings (cited - path:lines)
- Suite mono-projet chromium, entièrement sérialisée : `workers: 1` (playwright.config.ts:27), `fullyParallel: false` (:24). Trois `describe` explicitement `serial` : tests/integrations/mutations.spec.ts:28, tests/integrations/streaming.spec.ts:36, tests/library/reading-status.spec.ts:23.
- 20 specs, 52 corps `test()`, ~61 cas à l'exécution (boucles access-control/responsive). Comptage manuel fichier par fichier.
- Serveur E2E = `./node_modules/.bin/next dev` (playwright.config.ts:43) → compilation à la demande ; `timeout: 120_000` (:48) ; 3 webServers au total (Next + stubs 8444/8445, :62-73).
- `globalSetup` (tests/global-setup.ts) fait `prisma migrate deploy` (:19-22) puis seed 2 comptes + 4 configs provider (:26-81). Aucun `globalTeardown`.
- Aucun `storageState` nulle part : chaque test authentifié refait un login UI complet (tests/helpers/auth.ts:9-21). `.auth/` est dans `.gitignore` mais inutilisé.
- `signIn` dupliqué localement dans 6 specs : reader-stub.spec.ts:9, reader.spec.ts:12, reading-status.spec.ts:7, favorites-reading-lists.spec.ts:7, streaming.spec.ts:13, mutations.spec.ts:7.
- Attentes dures : reading-status.spec.ts:32 (500 ms), security.spec.ts:58 (1500 ms) et :67 (400 ms × 5), home.spec.ts:62 (800 ms), reader-stub.spec.ts:81/130/178/185 (800 ms).
- `networkidle` : responsive.spec.ts:12,27 ; streaming.spec.ts:23 ; reader-stub.spec.ts:115,141.
- Timeouts élevés (signal de lenteur) : streaming.spec.ts:37 (150 s), reader-stub.spec.ts:52 (90 s), security.spec.ts:32 (60 s).
- Stub B ralenti exprès de 750 ms : tests/helpers/stub-provider.mjs:20 (intentionnel, à conserver).
- CI : seul `.gitea/workflows/deploy.yml` (build/push Docker), aucun step E2E ; pas de `.github/`. `prisma/e2e.db` et `prisma/e2e-runtime.db` présents mais référencés nulle part.
- Sources externes (librarian) : auth via setup project + storageState (playwright.dev/docs/auth) ; prod build recommandé (nextjs.org/docs/app/guides/testing/playwright) ; `networkidle` DISCOURAGED et `waitForTimeout` découragé (playwright.dev/docs/api/class-page) ; trace/video par défaut `off` (playwright.dev/docs/test-use-options).

## Decisions (with rationale)
- D1 : prod build par défaut → plus gros gain, aligné prod, échappatoire locale conservée.
- D2 : setup project + storageState par rôle → supprime le coût de login répété et prépare la parallélisation.
- D3 : partition read-only/mutating par projets + comptes par worker → lève la contrainte « compte partagé » qui force `workers: 1`.
- D4 : remplacement systématique des attentes dures → gain + robustesse (anti-flake).
- D5 : hygiène (dédup, config morte, DB mortes) → supprime de la dette et des ambiguïtés.
- D6 : toute optimisation validée par une mesure avant/après et un run complet sans flake ; interdiction de réduire la couverture pour gagner du temps.

## Scope IN
- `playwright.config.ts` (mode serveur, workers, projets, reuseExistingServer, storageState).
- Nouveau setup project d'authentification + fichiers `tests/.auth/*.json` (gitignorés).
- `tests/helpers/auth.ts` (source unique), suppression des copies locales.
- Remplacement des `waitForTimeout`/`networkidle` dans les specs listées.
- Tag/projet de partition read-only vs mutating (metadata `test.describe`/annotations ou conventions de dossier).
- Hygiène : `E2E_TEST_MODE` (si confirmé mort), `prisma/e2e*.db`, `tests/README.md`.
- Harnais de mesure avant/après + preuve sous `.omo/evidence/`.

## Scope OUT (Must NOT have)
- Aucune modification du comportement applicatif sous `src/` (hors config Next uniquement si strictement requise et justifiée).
- Aucun nouveau scénario de test, aucune réduction de couverture, aucun `test.skip`/`test.only` pour accélérer.
- Ne pas supprimer le délai volontaire de 750 ms du stub provider.
- Ne pas ajouter de pipeline CI E2E.
- Ne pas changer le sens des scripts hors E2E (`dev`, `build`, `start`, `start:prod`).

## Open questions
- Aucune : intent UNCLEAR → defaults adoptés et listés ci-dessus, veto possible au gate.
- (À confirmer au gate : le mode build de production est-il acceptable comme défaut de `pnpm test:e2e`, avec `E2E_SKIP_BUILD=1` pour l'itération locale ?)

## Metis fold (2026-09-11)
- 30 findings intégrés au plan. Blockers traités : (B1) le mode production change `NODE_ENV` → cookies Secure (`src/lib/auth.ts:63`, `src/lib/active-connection.ts:79`) + bypass login `@test.local` désactivé (`auth-server.service.ts:88-97`) → **gate spike tâche 2** + garde-fou « no src/ edits » reformulé ; (B2) `waitForResponse(/read-progress/)` impossible (Server Action) → `expect.poll`/attente du POST `Next-Action` ; (B3) collision `test:e2e:report` → renommé `test:e2e:timings` ; (B4) mesure → wall-clock mono-commande incluant le build.
- Majors traités : workers non imposables par projet → 2 invocations + worker opt-in ; classification read-only non prouvée → snapshots avant/après ; dérive cache prod → spike ; build stale/manquant → garde BUILD_ID ; port codé en dur 3017 → baseURL ; comptage exact des tests ; ordre des `waitForResponse` ; pas de `reuseExistingServer`.
- Minors traités : dossier `.auth/`, `.next-e2e/` gitignore, commentaire `E2E_TEST_MODE` corrigé, budget de logins, `reader-stub` logins documentés.

## Review rounds
- r1 (Momus + Oracle) : CHANGES_REQUESTED (12 points bloquants/majeurs). Corrigés.
- r2 (Momus + Oracle) : CHANGES_REQUESTED (4 blockers) : plafond global `workers:1` inerte, `testMatch` sans extension ne matche rien, garde read-only 403-sur-non-GET cassant les lectures POST Komga, retrait `signIn` de reader-stub laissant `about:blank`. Corrigés.
- r3 (Momus + Oracle) : **APPROVED des deux côtés, 0 blocker** (Momus : APPROVED + 6 notes non bloquantes ; Oracle : APPROVED + 4 notes non bloquantes). Reçus : `.omo/plans/e2e-performance.md` approuvé tel quel.
- Notes non bloquantes à traiter par l'exécuteur : (3) tâche 8 doit ajouter `storageState: 'tests/.auth/stream.json'` dans le `use` des projets (tâche 4 le promet) ; (4) le `page.goto('/')` de la tâche 5 ne concerne que reader-stub:115, pas :141 ; (M1/M2) vérifier `--project=setup` en tâche 3 avant que le projet n'existe en tâche 4 ; l'assertion `mutating.workers:1` en tâche 7 avant sa création en tâche 8 ; (O1) retirer la mention du « read POST stripstream » (c'est `scanLibrary`, une écriture) ; (O2) fusionner 7(c) dans la tâche 8 pour éviter l'état transitoire « No projects matched » ; (O3) mode `E2E_BASE_URL` utiliser `test:e2e:run` ; (O4) F1 dédupliquer les suites de dépendances dans `--list`.
- Corrections r2 appliquées : plafond global `workers` relevé (`CI ? 2 : 4`) dans tâche 7 ; `testMatch` en globs exacts avec extension + énumération des 20 specs ; garde read-only limité aux opérations non-lecture (allowlist `POST /api/v1/books/list`, `POST /api/v1/series/list`, read POST Stripstream) + log des blocages à zéro ; navigation explicite `page.goto('/')` avant l'assertion shell (storageState ne navigue pas) ; budget login reformulé ≤2/compte ; acceptances `--list`, concurrence observée et parité des 20 specs ajoutées.

## Approval gate
status: approved
approved_at: 2026-09-11
<!-- User replied "ok". Plan generation authorized; execution NOT authorized (separate worker session via $start-work). -->
<!-- Explored, defaults chosen, no blocking unknown. Waiting for explicit user okay before emitting the plan. -->
<!-- Resume point: on later turns, read this draft and continue at the gate. -->
