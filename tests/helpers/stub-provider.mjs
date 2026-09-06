/**
 * Serveur stub Komga pour les tests e2e (dév).
 * Répond aux endpoints Komga utilisés par stripstream avec des données
 * factices distinctes selon le port (pour tester le changement de connexion).
 *
 * Usage : node tests/helpers/stub-provider.mjs <port>
 */
import http from 'node:http';

const port = Number(process.argv[2] || 8444);
// Instances distinctes : chaque connexion pointe vers un port différent
// pour simuler deux serveurs Komga avec des données différentes.
const instance = port === 8445 ? 'B' : 'A';
const libName = instance === 'B' ? 'Bibliothèque B' : 'Bibliothèque A';
const seriesName = instance === 'B' ? 'BD-B (Tome 1)' : 'BD-A (Tome 1)';
const seriesId = instance === 'B' ? 'series-b' : 'series-a';
const bookId = instance === 'B' ? 'book-b' : 'book-a';
// La seconde connexion est volontairement lente afin de rendre observable le
// fallback de bascule dans le test E2E.
const responseDelayMs = instance === 'B' ? 750 : 0;
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
    readStatus: 'UNREAD',
    status: 'ENDED',
    type: 'SINGLE_BOOK',
  };
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

const readingList = {
  id: 'list-a',
  name: 'E2E Reading List',
  description: 'A deterministic reading list for browser tests.',
  series_count: 1,
  preview_covers: ['book-a'],
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
    },
  ],
};

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

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = url.pathname;

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
  if (path === '/books/book-a/thumbnail' && req.method === 'GET') {
    return sendImage(res, 1);
  }

  // GET /api/v1/libraries
  if (path === '/api/v1/libraries' && req.method === 'GET') {
    return send(libraries);
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
    return send(paged(currentBooks()));
  }

  // POST /api/v1/series/list (body: condition)
  if (path === '/api/v1/series/list' && req.method === 'POST') {
    return send(paged(series));
  }

  // POST /api/v1/books/list (body: condition)
  if (path === '/api/v1/books/list' && req.method === 'POST') {
    return send(paged(currentBooks()));
  }

  // GET image and thumbnail fixtures used by the reader and its thumbnails.
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
  // eslint-disable-next-line no-console
  console.warn(`[stub-provider] instance ${instance} on :${port}`);
});
