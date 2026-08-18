import { Laptop, Moon, Sun } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Theme } from "@/features/settings/theme";
import { cn } from "@/lib/utils";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "A bright, clean workspace.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes in low light.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device appearance.",
    icon: Laptop,
  },
] satisfies ReadonlyArray<{
  value: Theme;
  label: string;
  description: string;
  icon: typeof Sun;
}>;

type Props = { theme: Theme; onThemeChange: (theme: Theme) => void };

export default function AppearanceSettings({
  theme,
  onThemeChange,
}: Readonly<Props>) {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalize how FileFlow looks and feels.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose the theme used throughout the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            value={[theme]}
            onValueChange={(value) => {
              const nextTheme = value[0] as Theme | undefined;
              if (nextTheme) onThemeChange(nextTheme);
            }}
            className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3"
            aria-label="Interface theme"
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  variant="outline"
                  aria-label={`Use ${option.label.toLowerCase()} theme`}
                  className="h-auto min-h-36 flex-col items-stretch justify-between gap-4 p-4 text-left whitespace-normal"
                >
                  <div
                    className={cn(
                      "flex h-16 overflow-hidden rounded-md border bg-background",
                      option.value === "dark" && "dark bg-background",
                    )}
                  >
                    <div className="w-1/4 border-r bg-sidebar" />
                    <div className="flex flex-1 flex-col gap-2 p-2">
                      <div className="h-2 w-1/2 rounded-full bg-foreground/70" />
                      <div className="h-2 w-3/4 rounded-full bg-muted-foreground/30" />
                      <div className="mt-auto h-3 rounded-sm bg-primary/70" />
                    </div>
                  </div>
                  <span className="flex items-start gap-3">
                    <Icon data-icon="inline-start" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </CardContent>
      </Card>
    </section>
  );
}
