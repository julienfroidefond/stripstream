import { BookOpen, Home, Library, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/services/auth.service";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
    {
      name: "Bibliothèques",
      href: "/libraries",
      icon: Library,
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r border-border/40 bg-background transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex-1 space-y-4 py-4">
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
