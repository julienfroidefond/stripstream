/**
 * Serveur stub Komga pour les tests e2e (dév).
 * Répond aux endpoints Komga utilisés par stripstream avec des données
 * factices distinctes selon le port (pour tester le changement de connexion).
 *
 * Usage : node tests/helpers/stub-provider.mjs <port>
 */
import http from 'node:http';
import { appendFileSync } from 'node:fs';

const port = Number(process.argv[2] || 8444);

// When E2E_STUB_READONLY=1, read-only journeys must not reach any writer.
// GET is always a read; the two list endpoints are POST-based read queries
// used legitimately by the application. Everything else is blocked.
const readonlyGuardEnabled = process.env.E2E_STUB_READONLY === '1';
const readonlyLogPath = process.env.E2E_STUB_LOG;
const READ_QUERY_POST_PATHS = new Set(['/api/v1/books/list', '/api/v1/series/list']);

function isReadOperation(method, path) {
  if (method === 'GET') return true;
  if (method === 'POST' && READ_QUERY_POST_PATHS.has(path)) return true;
  return false;
}
// Instances distinctes : chaque connexion pointe vers un port différent
// pour simuler deux serveurs Komga avec des données différentes.
const instance = port === 8445 ? 'B' : 'A';
// Instance C (port 8446) : panne partielle volontaire. `books/ondeck` échoue
// avec un 503 tandis que les autres endpoints restent sains, ce qui permet de
// vérifier le fallback `Promise.allSettled` de la home.
const failOndeck = port === 8446;
const libName = instance === 'B' ? 'Bibliothèque B' : 'Bibliothèque A';
const seriesName = instance === 'B' ? 'BD-B (Tome 1)' : 'BD-A (Tome 1)';
const seriesId = instance === 'B' ? 'series-b' : 'series-a';
const bookId = instance === 'B' ? 'book-b' : 'book-a';
// La seconde connexion est volontairement lente afin de rendre observable le
// fallback de bascule dans le test E2E.
const responseDelayMs = instance === 'B' ? 750 : 0;
// Sur l'instance B, toutes les séries sont déjà lues : le test du Wall peut
// ainsi vérifier l'état vide produit par le filtre « séries terminées ».
const allSeriesRead = instance === 'B';
let readProgress = null;

const libraries = [
  { id: `lib-${instance.toLowerCase()}`, name: libName, bookCount: 1 },
];

const series = Array.from({ length: 31 }, (_, index) => {
  const suffix = index === 0 ? '' : ` ${String(index + 1).padStart(2, '0')}`;
  return {
    id: index === 0 ? seriesId : `${seriesId}-${index + 1}`,
    name: `${seriesName}${suffix}`,
    metadata: {
      titleSort: `${seriesName}${suffix}`,
      summary: `Summary ${instance}`,
      title: `${seriesName}${suffix}`,
    },
    booksCount: 1,
    booksReadCount: allSeriesRead ? 1 : 0,
    readStatus: allSeriesRead ? 'READ' : 'UNREAD',
    status: 'ENDED',
    type: 'SINGLE_BOOK',
  };
});

// Série déjà terminée : elle donne au test du Wall un cas déterministe à
// masquer, sans toucher au fixture du lecteur (`series-a`).
series.push({
  id: 'series-read',
  name: `${seriesName} (terminée)`,
  metadata: {
    titleSort: `${seriesName} (terminée)`,
    summary: `Summary ${instance}`,
    title: `${seriesName} (terminée)`,
  },
  booksCount: 1,
  booksReadCount: 1,
  readStatus: 'READ',
  status: 'ENDED',
  type: 'SINGLE_BOOK',
});

const books = [
  {
    id: bookId,
    name: `${seriesName} #1`,
    metadata: { numberSort: 1, title: `${seriesName} #1`, summary: '' },
    seriesTitle: seriesName,
    seriesId,
    booksCountInSeries: 1,
    numbers: [1],
    readProgress: { page: 0, completed: false, readDate: null },
    mediaStatus: 'READY',
    media: { pagesCount: 10 },
    pageCount: 10,
  },
];

// Le carrousel « Reprendre la lecture » a besoin de plusieurs diapositives pour
// exercer un glissement. `books` reste le fixture principal (lecteur,
// bibliothèque) : ces tomes ne sont servis que par `books/ondeck`.
const heroOnDeckBooks = [
  {
    id: 'book-a-2',
    name: `${seriesName} #2`,
    metadata: { numberSort: 2, title: `${seriesName} #2`, summary: '' },
    seriesTitle: seriesName,
    seriesId,
    booksCountInSeries: 1,
    numbers: [2],
    readProgress: { page: 3, completed: false, readDate: '2026-01-02T00:00:00.000Z' },
    mediaStatus: 'READY',
    media: { pagesCount: 10 },
    pageCount: 10,
  },
  {
    id: 'book-a-3',
    name: `${seriesName} #3`,
    metadata: { numberSort: 3, title: `${seriesName} #3`, summary: '' },
    seriesTitle: seriesName,
    seriesId,
    booksCountInSeries: 1,
    numbers: [3],
    readProgress: { page: 1, completed: false, readDate: '2026-01-03T00:00:00.000Z' },
    mediaStatus: 'READY',
    media: { pagesCount: 10 },
    pageCount: 10,
  },
];

const readingList = {
  id: 'list-a',
  name: 'E2E Reading List',
  description: 'A deterministic reading list for browser tests.',
  series_count: 1,
  book_count: 3,
  books_read_count: 3,
  preview_covers: ['2b7c1c3e-5b0f-4a3e-9d0e-1f2a3b4c5d6e'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const readingListDetail = {
  ...readingList,
  items: [
    {
      id: 'series-a',
      name: seriesName,
      cover_url: null,
      first_book_id: 'book-a',
      library_id: 'lib-a',
      library_name: libName,
      position: 1,
      book_count: 3,
      books_read_count: 3,
    },
  ],
};

// ─── Stripstream fixtures ───────────────────────────────────────────────────
// La même instance stub sert la connexion "Stub Lists" (Stripstream) via des
// endpoints racine (sans préfixe /api/v1), distincts des routes Komga.

const stripstreamLibraries = [
  { id: 'lib-a', name: libName, root_path: '/data', enabled: true, book_count: 1, monitor_enabled: false, scan_mode: 'manual', watcher_enabled: false, next_scan_at: null },
];

const stripstreamSeriesItem = {
  series_id: 'series-a',
  name: seriesName,
  book_count: 1,
  books_read_count: 0,
  first_book_id: 'book-a',
  first_book_updated_at: '2026-01-01T00:00:00.000Z',
  library_id: 'lib-a',
  missing_count: 0,
  anilist_id: null,
  anilist_url: null,
  metadata_provider: null,
  series_status: 'ended',
  cover_url: null,
  genres: ['Action'],
  authors: ['E2E Author'],
  description: 'E2E Stripstream series summary',
  start_year: 2020,
  // Échelle API 0-5 (moyenne providers). Affiché ×2 → 8.4/10 sur les cards.
  community_score: 4.2,
  user_rating: null,
};

const stripstreamSeriesMetadata = {
  authors: ['E2E Author'],
  genres: ['Action'],
  publishers: ['E2E Publisher'],
  description: 'E2E Stripstream series summary',
  start_year: 2020,
  book_author: null,
  book_language: null,
};

const stripstreamBookItem = {
  id: 'book-a',
  library_id: 'lib-a',
  kind: 'comic',
  title: `${seriesName} #1`,
  updated_at: '2026-01-01T00:00:00.000Z',
  reading_status: 'unread',
  volume_type: 'regular',
  author: 'E2E Author',
  language: 'fr',
  page_count: 10,
  reading_current_page: null,
  reading_last_read_at: null,
  series: seriesName,
  series_id: 'series-a',
  thumbnail_url: null,
  volume: 1,
};

// Store de notation en mémoire (reset au démarrage du stub) — clé: seriesId.
const stripstreamRatings = new Map();
// Store de favoris Stripstream en mémoire (reset au démarrage du stub).
const stripstreamFavorites = new Set();
// Jobs de scan Stripstream : chaque POST crée un job dont le statut avance à
// chaque poll, ce qui rend le suivi observable en E2E.
const scanJobs = new Map();
let scanJobCounter = 0;

function stripstreamSeriesPage() {
  // 31 séries pour exercer la pagination, comme le fixture Komga.
  const items = Array.from({ length: 31 }, (_, index) => {
    const suffix = index === 0 ? '' : ` ${String(index + 1).padStart(2, '0')}`;
    return {
      ...stripstreamSeriesItem,
      series_id: index === 0 ? 'series-a' : `series-a-${index + 1}`,
      name: `${seriesName}${suffix}`,
    };
  });
  return { items, total: items.length, page: 1, limit: 50 };
}

function paged(content, page = 0, size = 20) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    last: true,
    number: page,
    size,
  };
}

// Lit et parse le corps JSON d'une requête POST. Les handlers existants lisaient
// déjà le flux en streaming ; ce helper centralise le cas `fullTextSearch`.
function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

// Komga envoie `{ fullTextSearch }` pour la recherche globale. Les autres appels
// (pagination, stats, continue-reading) envoient `{ condition }` sans ce champ et
// ne doivent pas être filtrés.
function filterByFullText(items, fullTextSearch, textOf) {
  const query = String(fullTextSearch ?? '').trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => textOf(item).toLowerCase().includes(query));
}

function currentBooks() {
  return books.map((book) => ({ ...book, readProgress }));
}

function sendImage(res, pageNumber) {
  // Une vraie image SVG permet à Image.decode() de valider le chargement,
  // tout en gardant le fixture entièrement autonome et lisible en debug.
  const label = `${instance} - page ${pageNumber}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="#f5f1e8"/><text x="400" y="600" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#28231e">${label}</text></svg>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.end(svg);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

  if (readonlyGuardEnabled && !isReadOperation(req.method, path)) {
    if (readonlyLogPath) {
      appendFileSync(readonlyLogPath, `${req.method} ${url.pathname}${url.search}\n`);
    }
    res.statusCode = 403;
    res.end(JSON.stringify({ error: 'read-only guard blocked write', method: req.method, path }));
    return;
  }

  const send = (data, status = 200) => {
    setTimeout(() => {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    }, responseDelayMs);
  };

  // Stripstream reading-list fixture (used when the test selects Stub Lists).
  if (path === '/reading-lists' && req.method === 'GET') {
    return send([readingList]);
  }
  if (path === '/reading-lists/list-a' && req.method === 'GET') {
    return send(readingListDetail);
  }

  // ─── Stripstream endpoints (root paths, for the "Stub Lists" connection) ───
  // Le préfixe /api/v1 distingue Komga ; ces routes racine servent Stripstream.

  if (path === '/libraries' && req.method === 'GET') {
    return send(stripstreamLibraries);
  }

  // POST /libraries/{id}/scan → crée un job suivi par /index/jobs/{id}.
  let sm = path.match(/^\/libraries\/([^/]+)\/scan$/);
  if (sm && req.method === 'POST') {
    const id = `scan-job-${++scanJobCounter}`;
    scanJobs.set(id, { libraryId: sm[1], polls: 0 });
    return send({
      id,
      library_id: sm[1],
      type: 'scan',
      status: 'pending',
      progress_percent: 0,
      processed_files: 0,
      total_files: 10,
    });
  }

  // GET /index/jobs/{id} → running au premier poll, success ensuite.
  sm = path.match(/^\/index\/jobs\/([^/]+)$/);
  if (sm && req.method === 'GET') {
    const job = scanJobs.get(sm[1]);
    if (!job) return send({ error: 'job not found' }, 404);
    job.polls += 1;
    const done = job.polls >= 2;
    return send({
      id: sm[1],
      library_id: job.libraryId,
      type: 'scan',
      status: done ? 'success' : 'running',
      progress_percent: done ? 100 : 40,
      processed_files: done ? 10 : 4,
      total_files: 10,
    });
  }

  // GET /series (cross-library list, utilisé par /libraries/lib-a via library_id)
  if (path === '/series' && req.method === 'GET') {
    return send(stripstreamSeriesPage());
  }

  // GET /series/ongoing, /series/recommendations
  if (path === '/series/ongoing' && req.method === 'GET') {
    return send([]);
  }
  if (path === '/series/recommendations' && req.method === 'GET') {
    return send([]);
  }

  // GET /series/{id}/details
  let ss = path.match(/^\/series\/([^/]+)\/details$/);
  if (ss && req.method === 'GET') {
    return send({ ...stripstreamSeriesItem, series_id: ss[1], name: ss[1] === 'series-a' ? seriesName : ss[1] });
  }

  // GET /series/{id}/metadata
  ss = path.match(/^\/series\/([^/]+)\/metadata$/);
  if (ss && req.method === 'GET') {
    return send(stripstreamSeriesMetadata);
  }

  // GET /series/{id}/related
  ss = path.match(/^\/series\/([^/]+)\/related$/);
  if (ss && req.method === 'GET') {
    return send([]);
  }

  // GET /series/{id}/ratings  ·  PUT /series/{id}/rating  ·  DELETE /series/{id}/rating
  ss = path.match(/^\/series\/([^/]+)\/ratings$/);
  if (ss && req.method === 'GET') {
    return send({
      user_rating: stripstreamRatings.get(ss[1]) ?? null,
      anilist_pulled_rating: null,
      provider_ratings: [
        { provider: 'anilist', rating: 4.2, rating_scale: 10, rating_count: 123 },
      ],
    });
  }
  ss = path.match(/^\/series\/([^/]+)\/rating$/);
  if (ss && req.method === 'PUT') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch { /* invalid payload stays empty */ }
      stripstreamRatings.set(ss[1], Number(payload.rating));
      res.statusCode = 204;
      res.end();
    });
    return;
  }
  if (ss && req.method === 'DELETE') {
    stripstreamRatings.delete(ss[1]);
    res.statusCode = 204;
    res.end();
    return;
  }

  // GET /favorites · GET|PUT|DELETE /series/{id}/favorite
  if (path === '/favorites' && req.method === 'GET') {
    return send(
      [...stripstreamFavorites].map((id) => ({
        ...stripstreamSeriesItem,
        series_id: id,
        name: id === 'series-a' ? seriesName : id,
      }))
    );
  }
  ss = path.match(/^\/series\/([^/]+)\/favorite$/);
  if (ss && req.method === 'GET') {
    return send(stripstreamFavorites.has(ss[1]));
  }
  if (ss && req.method === 'PUT') {
    stripstreamFavorites.add(ss[1]);
    res.statusCode = 204;
    res.end();
    return;
  }
  if (ss && req.method === 'DELETE') {
    stripstreamFavorites.delete(ss[1]);
    res.statusCode = 204;
    res.end();
    return;
  }

  // GET /books (list, with optional series/library_id/sort params)
  if (path === '/books' && req.method === 'GET') {
    return send({ items: [stripstreamBookItem], total: 1, page: 1, limit: 50 });
  }

  // GET /books/{id}
  ss = path.match(/^\/books\/([^/]+)$/);
  if (ss && req.method === 'GET') {
    return send({ ...stripstreamBookItem, id: ss[1] });
  }

  // GET /books/{id}/thumbnail (image proxy)
  ss = path.match(/^\/books\/([^/]+)\/thumbnail$/);
  if (ss && req.method === 'GET') {
    return sendImage(res, 1);
  }

  // GET /books/{id}/pages/{page} (Stripstream reader pages, 1-based)
  ss = path.match(/^\/books\/([^/]+)\/pages\/(\d+)$/);
  if (ss && req.method === 'GET') {
    return sendImage(res, Number(ss[2]));
  }

  // GET /metadata/links?series_id=...
  if (path === '/metadata/links' && req.method === 'GET') {
    return send([]);
  }

  // GET /search?q=...
  if (path === '/search' && req.method === 'GET') {
    return send({ series_hits: [], hits: [] });
  }

  // GET /api/v1/libraries
  if (path === '/api/v1/libraries' && req.method === 'GET') {
    return send(libraries);
  }

  // POST /api/v1/libraries/{id}/scan → Komga accepts the request (202) but has
  // no task-status endpoint, which is exactly the "progress unavailable" path.
  let km = path.match(/^\/api\/v1\/libraries\/([^/]+)\/scan$/);
  if (km && req.method === 'POST') {
    res.statusCode = 202;
    res.end();
    return;
  }

  // GET /api/v1/series/{id}
  let m = path.match(/^\/api\/v1\/series\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return send({ ...series[0], name: m[1] === seriesId ? seriesName : series[0].name });
  }

  // GET /api/v1/series/latest
  if (path === '/api/v1/series/latest' && req.method === 'GET') {
    return send(paged(series));
  }

  // GET /api/v1/books/latest
  if (path === '/api/v1/books/latest' && req.method === 'GET') {
    return send(paged(currentBooks()));
  }

  // GET /api/v1/books/ondeck
  if (path === '/api/v1/books/ondeck' && req.method === 'GET') {
    if (failOndeck) {
      return send({ error: 'ondeck unavailable' }, 503);
    }
    return send(paged([...currentBooks(), ...heroOnDeckBooks]));
  }

  // POST /api/v1/series/list (body: condition | fullTextSearch)
  if (path === '/api/v1/series/list' && req.method === 'POST') {
    const payload = await readJsonBody(req);
    const matched = filterByFullText(
      series,
      payload.fullTextSearch,
      (s) => `${s.name} ${s.metadata?.title ?? ''}`
    );
    return send(paged(matched));
  }

  // POST /api/v1/books/list (body: condition | fullTextSearch)
  if (path === '/api/v1/books/list' && req.method === 'POST') {
    const payload = await readJsonBody(req);
    const matched = filterByFullText(
      currentBooks(),
      payload.fullTextSearch,
      (b) => `${b.name} ${b.metadata?.title ?? ''}`
    );
    return send(paged(matched));
  }

  // GET image and thumbnail fixtures used by the reader and home carousels.
  m = path.match(/^\/api\/v1\/(?:books|series)\/([^/]+)\/thumbnail$/);
  if (m && req.method === 'GET') {
    return sendImage(res, 1);
  }

  m = path.match(/^\/api\/v1\/books\/([^/]+)\/pages\/(\d+)(?:\/thumbnail)?$/);
  if (m && req.method === 'GET') {
    return sendImage(res, Number(m[2]) + 1);
  }

  // GET /api/v1/books/{id}
  m = path.match(/^\/api\/v1\/books\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return send({ ...books[0], id: m[1], readProgress });
  }

  // GET /api/v1/books/{id}/pages
  m = path.match(/^\/api\/v1\/books\/([^/]+)\/pages$/);
  if (m && req.method === 'GET') {
    return send(Array.from({ length: 10 }, (_, number) => ({ number })));
  }

  // Mutations used by the reader progress E2E. The fixture keeps state in
  // memory for the duration of the Playwright run and is reset on startup.
  m = path.match(/^\/api\/v1\/books\/([^/]+)\/read-progress$/);
  if (m && req.method === 'PATCH') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let payload = {};
      try { payload = JSON.parse(body); } catch { /* invalid payload stays empty */ }
      readProgress = {
        page: Number(payload.page ?? 0),
        completed: Boolean(payload.completed),
        readDate: new Date().toISOString(),
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      send({ success: true });
    });
    return;
  }

  if (m && req.method === 'DELETE') {
    readProgress = null;
    return send({ success: true });
  }

  // 404 fallback
  return send({ error: 'not found', path }, 404);
});

server.listen(port, () => {
  console.warn(`[stub-provider] instance ${instance} on :${port}`);
});
