# E2E functional test backlog

The suite runs locally with the seeded SQLite database and deterministic stub
providers. Items marked `[x]` are covered by the current E2E suite; the other
scenarios remain candidates for later work.

## 1. Reading resume and completion

- [x] Resume a book from the last page after closing/reopening the reader.
- [x] Normalize a resumed reader to a known page before testing navigation.
- [x] Reach the final page and show the end-of-book dialog.
- [ ] Return to the series from the end-of-book dialog.

## 2. Offline and PWA

- [ ] Download a book locally.
- [ ] Open the downloaded book without network access.
- [ ] Remove a local download.
- [ ] Verify the offline fallback and downloaded-book state.

## 3. Persistent settings

- [ ] Persist light/dark theme after reload.
- [ ] Persist reader background after reload.
- [ ] Persist reading direction and double-page mode.
- [ ] Persist reader prefetch/cache preferences.

## 4. Connections

- [ ] Create, edit, and delete a Stripstream connection.
- [ ] Reject invalid connection URLs/tokens.
- [ ] Switch between Komga and Stripstream connections.
- [ ] Prevent deletion of the active connection.

## 5. Library browsing

- [x] Search and clear the search query while preserving the library route.
- [x] Change sorting and keep the state in the URL.
- [x] Toggle unread and missing filters through the URL.
- [x] Navigate between library pages.
- [x] Open a series from the library.
- [x] Cover an empty search result when provider data supports it.

## 6. Home

- [x] Show and use the Continue Reading hero.
- [x] Resume a book from the home page.
- [x] Show favorites on the home page after adding one.
- [x] Show reading lists on the home page and open one.
- [x] Refresh home content after switching connections.

## 7. Administration

- [ ] Exercise the positive administrator dashboard path.
- [ ] Manage a user as an administrator.
- [x] Confirm that a standard user is denied administrator access.
