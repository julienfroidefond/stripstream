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

const libraries = [
  { id: `lib-${instance.toLowerCase()}`, name: libName, bookCount: 1 },
];

const series = [
  {
    id: seriesId,
    name: seriesName,
    metadata: { titleSort: seriesName, summary: `Summary ${instance}`, title: seriesName },
    booksCount: 1,
    readStatus: 'UNREAD',
    status: 'ENDED',
    type: 'SINGLE_BOOK',
  },
];

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
    return send(paged(books));
  }

  // GET /api/v1/books/ondeck
  if (path === '/api/v1/books/ondeck' && req.method === 'GET') {
    return send(paged(books));
  }

  // POST /api/v1/series/list (body: condition)
  if (path === '/api/v1/series/list' && req.method === 'POST') {
    return send(paged(series));
  }

  // POST /api/v1/books/list (body: condition)
  if (path === '/api/v1/books/list' && req.method === 'POST') {
    return send(paged(books));
  }

  // GET /api/v1/books/{id}
  m = path.match(/^\/api\/v1\/books\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return send({ ...books[0], id: m[1] });
  }

  // GET /api/v1/books/{id}/pages
  m = path.match(/^\/api\/v1\/books\/([^/]+)\/pages$/);
  if (m && req.method === 'GET') {
    return send([{ number: 0 }]);
  }

  // 404 fallback
  return send({ error: 'not found', path }, 404);
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.warn(`[stub-provider] instance ${instance} on :${port}`);
});
