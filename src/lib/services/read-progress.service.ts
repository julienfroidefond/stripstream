import prisma from "@/lib/prisma";
import type { NormalizedBook, NormalizedReadProgress } from "@/lib/providers/types";

export class ReadProgressService {
  static async getForBooks(userId: number, books: NormalizedBook[]): Promise<NormalizedBook[]> {
    if (books.length === 0) return books;

    const progresses = await prisma.readProgress.findMany({
      where: { userId, bookId: { in: books.map((book) => book.id) } },
      select: { bookId: true, page: true, completed: true, lastReadAt: true },
    });
    const byBookId = new Map(progresses.map((progress) => [progress.bookId, progress]));

    // Ne jamais reprendre l'état du compte technique du fournisseur : il peut
    // être partagé par plusieurs utilisateurs Stripstream.
    return books.map((book) => {
      const progress = byBookId.get(book.id);
      return {
        ...book,
        readProgress: progress
          ? {
              page: progress.page,
              completed: progress.completed,
              lastReadAt: progress.lastReadAt.toISOString(),
            }
          : null,
      };
    });
  }

  static async get(userId: number, bookId: string): Promise<NormalizedReadProgress | null> {
    const progress = await prisma.readProgress.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: { page: true, completed: true, lastReadAt: true },
    });
    if (!progress) return null;
    return {
      page: progress.page,
      completed: progress.completed,
      lastReadAt: progress.lastReadAt.toISOString(),
    };
  }

  static async save(userId: number, bookId: string, page: number | null, completed: boolean): Promise<void> {
    await prisma.readProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: { userId, bookId, page, completed, lastReadAt: new Date() },
      update: { page, completed, lastReadAt: new Date() },
    });
  }

  static async remove(userId: number, bookId: string): Promise<void> {
    await prisma.readProgress.deleteMany({ where: { userId, bookId } });
  }
}
