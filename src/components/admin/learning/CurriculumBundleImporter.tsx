import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ImportResult = {
  success: boolean;
  message?: string;
  counts?: Record<string, number>;
  verification?: Record<string, number>;
  ready_for_phase_3?: boolean;
  error?: string;
};

const CurriculumBundleImporter = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handlePick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;

    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      let bundle: unknown;
      try {
        bundle = JSON.parse(text);
      } catch {
        throw new Error("Selected file is not valid JSON.");
      }

      toast.info(`Uploading ${file.name}…`);
      const { data, error } = await supabase.functions.invoke(
        "import-curriculum-bundle",
        { body: bundle }
      );

      if (error) throw error;
      const res = data as ImportResult;
      setResult(res);

      if (res.success && res.ready_for_phase_3) {
        toast.success("Curriculum imported — all FKs resolved.");
      } else if (res.success) {
        toast.warning("Imported, but some FKs are NULL. See details below.");
      } else {
        toast.error(res.error ?? "Import failed.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Import Curriculum Bundle</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your transformer output (<code>output.json</code>). Sends it to the{" "}
            <code>import-curriculum-bundle</code> edge function and dual-writes
            UUID + legacy columns.
          </p>
        </div>
        <Button onClick={handlePick} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" /> Importing…
            </>
          ) : (
            <>
              <Upload /> Upload bundle JSON
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {result && (
        <div className="space-y-3">
          {result.success ? (
            <div
              className={`flex items-center gap-2 text-sm font-medium ${
                result.ready_for_phase_3 ? "text-primary" : "text-amber-600"
              }`}
            >
              {result.ready_for_phase_3 ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {result.message}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {result.error}
            </div>
          )}

          {result.counts && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Inserted / upserted
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {Object.entries(result.counts).map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <div className="text-muted-foreground text-xs">{k}</div>
                    <div className="font-mono">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.verification && (
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                Verification (NULL counts — must be 0)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {Object.entries(result.verification).map(([k, v]) => (
                  <div
                    key={k}
                    className={`rounded-md border px-3 py-2 ${
                      v > 0
                        ? "border-destructive/40 bg-destructive/5"
                        : "bg-muted/30"
                    }`}
                  >
                    <div className="text-muted-foreground text-xs">{k}</div>
                    <div className="font-mono">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CurriculumBundleImporter;
