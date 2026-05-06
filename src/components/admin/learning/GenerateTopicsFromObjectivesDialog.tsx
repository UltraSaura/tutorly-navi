import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useGenerateTopicsFromObjectives,
  type PreviewTopic,
  type GenerateTopicsResult,
} from "@/hooks/useGenerateTopicsFromObjectives";
import { useLearningCategories } from "@/hooks/useManageLearningContent";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "filters" | "preview" | "done";

export const GenerateTopicsFromObjectivesDialog = ({ open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useLearningCategories();
  const generate = useGenerateTopicsFromObjectives();

  const [step, setStep] = useState<Step>("filters");
  const [countryCode, setCountryCode] = useState("fr");
  const [levelCode, setLevelCode] = useState<string>("__all__");
  const [subjectId, setSubjectId] = useState<string>("__all__");
  const [categoryId, setCategoryId] = useState<string>("");
  const [preview, setPreview] = useState<GenerateTopicsResult | null>(null);

  // Distinct levels and subjects available in objectives
  const { data: filterOptions } = useQuery({
    queryKey: ["objective-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("objectives")
        .select("level, subject_id_uuid");
      if (error) throw error;
      const levels = [...new Set((data || []).map((d: any) => d.level).filter(Boolean))].sort();
      const subjectIds = [
        ...new Set((data || []).map((d: any) => d.subject_id_uuid).filter(Boolean)),
      ] as string[];

      let subjects: { id: string; name: string }[] = [];
      if (subjectIds.length) {
        const { data: subs } = await supabase
          .from("subjects")
          .select("id, name")
          .in("id", subjectIds);
        subjects = (subs as any) || [];
      }
      return { levels, subjects };
    },
    enabled: open,
  });

  const reset = () => {
    setStep("filters");
    setPreview(null);
    setLevelCode("__all__");
    setSubjectId("__all__");
    setCategoryId("");
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const runDryRun = async () => {
    if (!categoryId) {
      toast.error("Please pick a category");
      return;
    }
    try {
      const result = await generate.mutateAsync({
        category_id: categoryId,
        country_code: countryCode,
        level_code: levelCode === "__all__" ? null : levelCode,
        subject_id_uuid: subjectId === "__all__" ? null : subjectId,
        dry_run: true,
      });
      setPreview(result);
      setStep("preview");
    } catch (e: any) {
      toast.error(e.message || "Preview failed");
    }
  };

  const runCommit = async () => {
    try {
      const result = await generate.mutateAsync({
        category_id: categoryId,
        country_code: countryCode,
        level_code: levelCode === "__all__" ? null : levelCode,
        subject_id_uuid: subjectId === "__all__" ? null : subjectId,
        dry_run: false,
      });
      setPreview(result);
      setStep("done");
      toast.success(
        `Created ${result.created} topics, skipped ${result.skipped_existing}, linked ${result.links_added} objectives`,
      );
      queryClient.invalidateQueries({ queryKey: ["learning-topics"] });
      queryClient.invalidateQueries({ queryKey: ["program-topics"] });
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    }
  };

  const willCreate = useMemo(
    () => (preview?.topics || []).filter((t) => t.status === "will_create").length,
    [preview],
  );
  const alreadyExists = useMemo(
    () => (preview?.topics || []).filter((t) => t.status === "already_exists").length,
    [preview],
  );
  const orphans = useMemo(
    () => (preview?.topics || []).filter((t) => t.status === "skipped_orphan").length,
    [preview],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Generate Topics from Objectives
          </DialogTitle>
          <DialogDescription>
            Auto-create one topic per (level × subdomain) from imported curriculum
            objectives. Each topic is pre-linked to its source objectives.
          </DialogDescription>
        </DialogHeader>

        {step === "filters" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">France (fr)</SelectItem>
                    <SelectItem value="en">English (en)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={levelCode} onValueChange={setLevelCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All levels</SelectItem>
                    {(filterOptions?.levels || []).map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All subjects</SelectItem>
                    {(filterOptions?.subjects || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Topics are upserted by (level, subdomain, category) so re-running
                this is safe. Existing topics will not be duplicated.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={runDryRun} disabled={generate.isPending || !categoryId}>
                {generate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Preview
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">{willCreate} will create</Badge>
              <Badge variant="secondary">{alreadyExists} already exist</Badge>
              {orphans > 0 && (
                <Badge variant="destructive">{orphans} orphan objectives</Badge>
              )}
            </div>

            <div className="border rounded-md max-h-[50vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Topic name</TableHead>
                    <TableHead className="text-right"># objectives</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.topics.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{t.level_code}</TableCell>
                      <TableCell>{t.subject_name || "—"}</TableCell>
                      <TableCell>{t.domain_name || "—"}</TableCell>
                      <TableCell className="font-medium">{t.topic_name}</TableCell>
                      <TableCell className="text-right">{t.objective_count}</TableCell>
                      <TableCell>
                        {t.status === "will_create" && (
                          <Badge variant="default">will create</Badge>
                        )}
                        {t.status === "already_exists" && (
                          <Badge variant="secondary">exists</Badge>
                        )}
                        {t.status === "skipped_orphan" && (
                          <Badge variant="destructive">orphan</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("filters")}>
                Back
              </Button>
              <Button onClick={runCommit} disabled={generate.isPending || willCreate === 0}>
                {generate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create {willCreate} topics
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && preview && (
          <div className="space-y-4">
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Created <strong>{preview.created}</strong> topics, skipped{" "}
                <strong>{preview.skipped_existing}</strong>, linked{" "}
                <strong>{preview.links_added}</strong> objectives.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
