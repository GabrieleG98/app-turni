import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={className}
      aria-label={theme === "dark" ? "Passa a tema chiaro" : "Passa a tema scuro"}
      title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
