# Plan - Suppression des routes API GET restantes

## État actuel

Routes GET encore présentes mais peu/n'utilisées :

| Route | Utilisation actuelle | Action |
|-------|---------------------|--------|
| `GET /api/komga/config` | ❌ Non utilisée | 🔴 Supprimer |
| `GET /api/komga/favorites` | Sidebar, SeriesHeader (client) | 🟡 Optimiser |
| `GET /api/preferences` | PreferencesContext (client) | 🟡 Optimiser |
| `GET /api/komga/books/[bookId]` | ClientBookPage, DownloadManager | 🟡 Supprimer (données déjà en props) |
| `GET /api/user/profile` | ? | 🔍 Vérifier |

## Actions proposées

### 1. Supprimer `GET /api/komga/config`

La config est déjà appelée directement dans `settings/page.tsx` via `ConfigDBService.getConfig()`.

**Action** : Supprimer la route API.

---

### 2. Optimiser les préférences

Les préférences sont déjà passées depuis `layout.tsx` via `PreferencesService.getPreferences()`. 
Le `PreferencesContext` refetch en client - c'est redondant.

**Action** : Le contexte utilise déjà les `initialPreferences`. Le fetch client n'est nécessaire que si on n'a pas les données initiales.

---

### 3. Supprimer `GET /api/komga/books/[bookId]`

Regardons ce que fait `ClientBookPage` :

```tsx
// Server Component (page.tsx) fetch les données
const data = await BookService.getBook(bookId);

// Passe à ClientBookPage
<ClientBookPage bookId={bookId} initialData={{ ...data, nextBook }} />

// ClientClientBookPage refetch en client si pas de initialData
useEffect(() => {
  if (!initialData) fetchBookData(); // Only if SSR failed
}, [bookId, initialData]);
```

**Action** : Supprimer le fetch client - les données sont déjà en props.

---

### 4. Garder pour l'instant

Ces routes nécessitent plus de refactoring :

- `GET /api/komga/favorites` - Utilisé dans des composants clients (Sidebar)
- `GET /api/admin/users` - AdminContent
- `GET /api/admin/stats` - AdminContent

Ces cas pourraient être résolus en passant les données depuis des Server Components parents.
