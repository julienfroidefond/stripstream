# Plan de conversion API Routes → Server Actions

## État des lieux

### ✅ Converti

| Ancienne Route | Server Action | Status |
|----------------|---------------|--------|
| `PATCH /api/komga/books/[bookId]/read-progress` | `updateReadProgress()` | ✅ Done |
| `DELETE /api/komga/books/[bookId]/read-progress` | `deleteReadProgress()` | ✅ Done |
| `POST /api/komga/favorites` | `addToFavorites()` | ✅ Done |
| `DELETE /api/komga/favorites` | `removeFromFavorites()` | ✅ Done |
| `PUT /api/preferences` | `updatePreferences()` | ✅ Done |

---

## À convertir (priorité haute)

### 1. Scan de bibliothèque

**Route actuelle** : `api/komga/libraries/[libraryId]/scan/route.ts`

```typescript
// Action à créer : src/app/actions/library.ts
export async function scanLibrary(libraryId: string)
```

**Appelants à migrer** :
- `components/library/ScanButton.tsx` (POST fetch)

---

## À convertir (priorité moyenne)

### 2. Configuration Komga

**Route actuelle** : `api/komga/config/route.ts`

```typescript
// Action à créer : src/app/actions/config.ts
export async function saveKomgaConfig(config: KomgaConfigData)
export async function getKomgaConfig()
```

---

### 3. Mot de passe utilisateur

**Route actuelle** : `api/user/password/route.ts`

```typescript
// Action à créer : src/app/actions/password.ts
export async function changePassword(currentPassword: string, newPassword: string)
```

---

### 4. Inscription

**Route actuelle** : `api/auth/register/route.ts`

```typescript
// Action à créer : src/app/actions/auth.ts
export async function registerUser(email: string, password: string)
```

---

## À convertir (priorité basse - admin)

### 5. Gestion des utilisateurs (admin)

**Routes** :
- `api/admin/users/[userId]/route.ts` (PATCH, DELETE)
- `api/admin/users/[userId]/password/route.ts` (PUT)

```typescript
// Actions à créer : src/app/actions/admin.ts
export async function updateUserRoles(userId: string, roles: string[])
export async function deleteUser(userId: string)
export async function resetUserPassword(userId: string, newPassword: string)
```

---

## À garder en API Routes

Ces routes ne doivent PAS être converties :

| Route | Raison |
|-------|--------|
| `api/komga/home` | GET - called from Server Components |
| `api/komga/books/[bookId]` | GET - fetch données livre |
| `api/komga/series/*` | GET - fetch séries |
| `api/komga/libraries/*` | GET - fetch bibliothèques |
| `api/komga/random-book` | GET - fetch aléatoire |
| `api/komga/images/*` | GET - servir images (streaming) |
| `api/auth/[...nextauth]/*` | NextAuth handler externe |
| `api/admin/users` | GET - fetch liste users |
| `api/admin/stats` | GET - fetch stats |
| `api/user/profile` | GET - fetch profile |

---

## Pattern à suivre

```typescript
// src/app/actions/[feature].ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Service } from "@/lib/services/service";

export async function actionName(params): Promise<{ success: boolean; message: string }> {
  try {
    await Service.doSomething(params);
    
    // Invalider le cache si nécessaire
    revalidateTag("cache-tag", "min");
    revalidatePath("/");
    
    return { success: true, message: "Succès" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

```typescript
// src/components/feature/Component.tsx
"use client";

import { actionName } from "@/app/actions/feature";

const handleAction = async () => {
  const result = await actionName(params);
  if (!result.success) {
    // handle error
  }
};
```
