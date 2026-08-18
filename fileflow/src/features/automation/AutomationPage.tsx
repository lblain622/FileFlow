import { useCallback, useEffect, useRef, useState } from "react";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { Activity, ArrowDown, ArrowUp, Eye, FolderInput, GripVertical, Plus, Trash2, Undo2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getAutomationState,
  previewDownloads,
  saveAutomationRules,
  scanDownloads,
  undoAutomatedMove,
  type AutomationRule,
  type AutomationState,
  type PreviewResult,
  type RuleMatchType,
} from "@/lib/backend";

const POLL_INTERVAL_MS = 5_000;
const fileName = (path: string) => path.split(/[\\/]/).pop() ?? path;

export default function AutomationPage() {
  const [state, setState] = useState<AutomationState>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [matchType, setMatchType] = useState<RuleMatchType>("extension");
  const [matchValue, setMatchValue] = useState("");
  const [destination, setDestination] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedRuleId, setDraggedRuleId] = useState<string>();
  const [preview, setPreview] = useState<PreviewResult>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const scanInFlight = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getAutomationState();
    setState(next);
  }, []);

  const runScan = useCallback(async () => {
    if (scanInFlight.current) return;
    scanInFlight.current = true;
    try {
      const result = await scanDownloads();
      if (result.moved || result.errors.length) {
        setNotice(result.moved ? `Moved ${result.moved} ${result.moved === 1 ? "file" : "files"}.` : undefined);
        setError(result.errors.length ? result.errors.join(" ") : undefined);
        await refresh();
      }
    } catch (scanError) {
      setError(String(scanError));
    } finally {
      scanInFlight.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    void refresh().then(runScan).catch((loadError: unknown) => setError(String(loadError)));
    const timer = window.setInterval(() => void runScan(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, runScan]);

  const persistRules = async (rules: AutomationRule[]) => {
    await saveAutomationRules(rules);
    setState((current) => current ? { ...current, rules } : current);
  };

  const addRule = async () => {
    if (!state || !name.trim() || !matchValue.trim() || !destination) return;
    setSaving(true);
    setError(undefined);
    try {
      await persistRules([...state.rules, {
        id: crypto.randomUUID(),
        name: name.trim(),
        matchType,
        matchValue: matchValue.trim(),
        destination,
        enabled: true,
      }]);
      setDialogOpen(false);
      setName("");
      setMatchValue("");
      setDestination("");
      await runScan();
    } catch (saveError) {
      setError(String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (id: string, change: Partial<AutomationRule>) => {
    if (!state) return;
    void persistRules(state.rules.map((rule) => rule.id === id ? { ...rule, ...change } : rule))
      .then(runScan)
      .catch((saveError: unknown) => setError(String(saveError)));
  };

  const removeRule = (id: string) => {
    if (!state) return;
    void persistRules(state.rules.filter((rule) => rule.id !== id))
      .catch((saveError: unknown) => setError(String(saveError)));
  };

  const reorderRule = (sourceId: string, targetId: string) => {
    if (!state || sourceId === targetId) return;
    const rules = [...state.rules];
    const sourceIndex = rules.findIndex((rule) => rule.id === sourceId);
    const targetIndex = rules.findIndex((rule) => rule.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [movedRule] = rules.splice(sourceIndex, 1);
    rules.splice(targetIndex, 0, movedRule);
    void persistRules(rules).catch((saveError: unknown) => setError(String(saveError)));
  };

  const moveRule = (id: string, offset: -1 | 1) => {
    if (!state) return;
    const index = state.rules.findIndex((rule) => rule.id === id);
    const target = state.rules[index + offset];
    if (target) reorderRule(id, target.id);
  };

  const showPreview = async () => {
    setPreviewing(true);
    setError(undefined);
    try {
      setPreview(await previewDownloads());
      setPreviewOpen(true);
    } catch (previewError) {
      setError(String(previewError));
    } finally {
      setPreviewing(false);
    }
  };

  const undoMove = async (id: string) => {
    try {
      await undoAutomatedMove(id);
      setNotice("Move undone. The file is back in Downloads.");
      await refresh();
    } catch (undoError) {
      setError(String(undoError));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-background p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Downloads automation</h1>
          <p className="text-sm text-muted-foreground">Watching {state?.downloadsPath ?? "your Downloads folder"} every five seconds.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={previewing} onClick={() => void showPreview()}><Eye data-icon="inline-start" />Dry run</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus data-icon="inline-start" />New rule</Button>
        </div>
      </div>
      {error ? <Alert variant="destructive"><AlertTitle>Automation needs attention</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {notice ? <Alert><Activity /><AlertTitle>Automation update</AlertTitle><AlertDescription>{notice}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Drag rules to set priority. The first enabled rule that matches a settled file wins.</CardDescription>
          <CardAction><Badge variant="secondary">{state?.rules.filter((rule) => rule.enabled).length ?? 0} active</Badge></CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state?.rules.length ? state.rules.map((rule, index) => (
            <div
              key={rule.id}
              draggable
              onDragStart={(event) => { setDraggedRuleId(rule.id); event.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => setDraggedRuleId(undefined)}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDrop={(event) => { event.preventDefault(); if (draggedRuleId) reorderRule(draggedRuleId, rule.id); setDraggedRuleId(undefined); }}
              className="flex items-center gap-3 rounded-lg border p-4"
            >
              <GripVertical className="cursor-grab text-muted-foreground" aria-hidden="true" />
              <Switch checked={rule.enabled} onCheckedChange={(enabled) => updateRule(rule.id, { enabled })} aria-label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{rule.name}</p>
                <p className="truncate text-sm text-muted-foreground">{rule.matchType === "extension" ? `Extension is .${rule.matchValue.replace(/^\./, "")}` : `Name contains “${rule.matchValue}”`} → {rule.destination}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" disabled={index === 0} aria-label={`Move ${rule.name} up`} onClick={() => moveRule(rule.id, -1)}><ArrowUp /></Button>
                <Button variant="ghost" size="icon-sm" disabled={index === state.rules.length - 1} aria-label={`Move ${rule.name} down`} onClick={() => moveRule(rule.id, 1)}><ArrowDown /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${rule.name}`} onClick={() => removeRule(rule.id)}><Trash2 /></Button>
              </div>
            </div>
          )) : <Empty><EmptyHeader><EmptyTitle>No rules yet</EmptyTitle><EmptyDescription>Add a rule to begin organizing new downloads automatically.</EmptyDescription></EmptyHeader></Empty>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Move history</CardTitle><CardDescription>FileFlow keeps the latest 500 automatic moves and lets you undo available entries.</CardDescription></CardHeader>
        <CardContent>
          {state?.history.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Rule</TableHead><TableHead>Moved</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{state.history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="max-w-64 truncate" title={entry.destination}>{fileName(entry.destination)}</TableCell>
                  <TableCell>{entry.ruleName}</TableCell>
                  <TableCell>{new Date(entry.movedAtMs).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={entry.undoneAtMs ? "outline" : "secondary"}>{entry.undoneAtMs ? "Undone" : "Moved"}</Badge></TableCell>
                  <TableCell className="text-right"><Button variant="outline" size="sm" disabled={Boolean(entry.undoneAtMs)} onClick={() => void undoMove(entry.id)}><Undo2 data-icon="inline-start" />Undo</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <Empty><EmptyHeader><EmptyTitle>No moves yet</EmptyTitle><EmptyDescription>Moves made by enabled rules will appear here.</EmptyDescription></EmptyHeader></Empty>}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create an automation rule</DialogTitle><DialogDescription>Choose what to match and where matching downloads should go.</DialogDescription></DialogHeader>
          <FieldGroup>
            <Field><FieldLabel htmlFor="rule-name">Rule name</FieldLabel><Input id="rule-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Move PDF documents" /></Field>
            <Field>
              <FieldLabel>Match files by</FieldLabel>
              <ToggleGroup value={[matchType]} onValueChange={(values) => { const value = values[0] as RuleMatchType | undefined; if (value) setMatchType(value); }} variant="outline">
                <ToggleGroupItem value="extension">Extension</ToggleGroupItem><ToggleGroupItem value="nameContains">Name contains</ToggleGroupItem>
              </ToggleGroup>
              <FieldDescription>{matchType === "extension" ? "For example: pdf, jpg, or zip." : "Matching is not case-sensitive."}</FieldDescription>
              <Input value={matchValue} onChange={(event) => setMatchValue(event.target.value)} placeholder={matchType === "extension" ? "pdf" : "invoice"} />
            </Field>
            <Field data-invalid={false}>
              <FieldLabel>Destination folder</FieldLabel>
              <Button variant="outline" className="justify-start" onClick={async () => { const path = await openFolderDialog({ directory: true, multiple: false, title: "Choose rule destination" }); if (typeof path === "string") setDestination(path); }}><FolderInput data-icon="inline-start" />{destination || "Choose folder"}</Button>
              {!destination ? <FieldError /> : null}
            </Field>
          </FieldGroup>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button disabled={saving || !name.trim() || !matchValue.trim() || !destination} onClick={() => void addRule()}>Create rule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Dry-run preview</DialogTitle><DialogDescription>No files were moved. This is what the current ordered rules would do to settled downloads.</DialogDescription></DialogHeader>
          {preview?.errors.length ? <Alert variant="destructive"><AlertTitle>Skipped files</AlertTitle><AlertDescription>{preview.errors.join(" ")}</AlertDescription></Alert> : null}
          {preview?.moves.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>File</TableHead><TableHead>Rule</TableHead><TableHead>Destination</TableHead></TableRow></TableHeader>
              <TableBody>{preview.moves.map((move) => <TableRow key={move.source}><TableCell>{fileName(move.source)}</TableCell><TableCell>{move.ruleName}</TableCell><TableCell className="max-w-72 truncate" title={move.destination}>{move.destination}</TableCell></TableRow>)}</TableBody>
            </Table>
          ) : <Empty><EmptyHeader><EmptyTitle>No files would move</EmptyTitle><EmptyDescription>No settled Downloads files currently match an enabled rule.</EmptyDescription></EmptyHeader></Empty>}
          <DialogFooter><Button onClick={() => setPreviewOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
