import { BookOpen, Home, Library, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/services/auth.service";
import { useEffect, useState } from "react";
import { KomgaLibrary } from "@/types/komga";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [libraries, setLibraries] = useState<KomgaLibrary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLibraries = async () => {
      try {
        const response = await fetch("/api/komga/libraries");
        if (!response.ok) {
          throw new Error("Erreur lors de la récupération des bibliothèques");
        }
        const data = await response.json();
        setLibraries(data);
      } catch (error) {
        console.error("Erreur:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibraries();
  }, []);

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  const navigation = [
    {
      name: "Accueil",
      href: "/",
      icon: Home,
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r border-border/40",
        "bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60",
        "transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
      id="sidebar"
    >
      <div className="flex-1 space-y-4 py-4 overflow-y-auto">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Navigation</h2>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href ? "bg-accent" : "transparent"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Bibliothèques</h2>
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Chargement...</div>
            ) : libraries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Aucune bibliothèque</div>
            ) : (
              libraries.map((library) => (
                <Link
                  key={library.id}
                  href={`/libraries/${library.id}`}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === `/libraries/${library.id}` ? "bg-accent" : "transparent"
                  )}
                >
                  <Library className="mr-2 h-4 w-4" />
                  {library.name}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="px-3 py-2">
          <div className="space-y-1">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Configuration</h2>
            <Link
              href="/settings"
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                pathname === "/settings" ? "bg-accent" : "transparent"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Préférences
            </Link>
          </div>
        </div>
      </div>

      {/* Bouton de déconnexion */}
      <div className="p-3 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
