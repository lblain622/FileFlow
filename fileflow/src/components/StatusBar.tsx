interface StatusBarProps {
  selectionLabel: string;
  backendStatus?: string;
  backendError?: string;
}

export default function StatusBar({ selectionLabel, backendStatus, backendError }: StatusBarProps) {
  const connectionLabel = backendError
    ? `Backend unavailable: ${backendError}`
    : backendStatus ?? "Connecting to backend…";

  return (
    <footer className="flex h-10 shrink-0 items-center justify-between gap-4 border-t bg-background px-6 text-xs text-muted-foreground">
      <span>{selectionLabel}</span>
      <span className="truncate" title={connectionLabel}>{connectionLabel}</span>
    </footer>
  );
}
