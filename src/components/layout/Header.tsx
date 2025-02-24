import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <button
          onClick={onToggleSidebar}
          className="mr-2 px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md"
          aria-label="Toggle sidebar"
          id="sidebar-toggle"
        >
          <div className="flex items-center justify-center w-5 h-5">
            <Menu className="h-[1.2rem] w-[1.2rem]" />
          </div>
        </button>

        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <span className="hidden font-bold sm:inline-block">StripStream</span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            <button
              onClick={toggleTheme}
              className="px-2 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md"
              aria-label="Toggle theme"
            >
              <div className="relative flex items-center justify-center w-5 h-5">
                <Sun className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute inset-0 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </div>
              <span className="sr-only">Toggle theme</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
