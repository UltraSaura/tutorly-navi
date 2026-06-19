import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';

interface EditionRow {
  id: string;
  subject: string;
  cycle: string;
  bo_reference: string;
  bo_url: string | null;
  source_pdf_url: string | null;
  status: 'projet' | 'active' | 'superseded';
  ingested_at: string | null;
  domain_count: number;
}

async function fetchEditions(): Promise<EditionRow[]> {
  const { data: editions, error } = await supabase
    .from('curriculum_edition')
    .select('id, subject, cycle, bo_reference, bo_url, source_pdf_url, status, ingested_at')
    .order('cycle')
    .order('subject');

  if (error) throw error;

  // Count domains per edition
  const ids = (editions ?? []).map((e) => e.id);
  const { data: domainRows } = ids.length
    ? await supabase
        .from('domains')
        .select('edition_id')
        .in('edition_id', ids)
    : { data: [] };

  const countByEdition = new Map<string, number>();
  for (const row of domainRows ?? []) {
    if (row.edition_id) {
      countByEdition.set(row.edition_id, (countByEdition.get(row.edition_id) ?? 0) + 1);
    }
  }

  return (editions ?? []).map((e) => ({
    ...e,
    domain_count: countByEdition.get(e.id) ?? 0,
  }));
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-[#EAF3DE] text-[#27500A] border-[#9FE1CB]',
  projet: 'bg-[#FFF3DC] text-[#B45309] border-[#FAC775]',
  superseded: 'bg-[#F3F6FA] text-[#667085] border-[#EAECEF]',
};

export default function CurriculumEditionIngestion() {
  const [ingesting, setIngesting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: editions, isLoading, error } = useQuery({
    queryKey: ['curriculum-editions-admin'],
    queryFn: fetchEditions,
  });

  const handleIngest = async (edition: EditionRow) => {
    if (!edition.source_pdf_url) {
      toast({
        title: 'PDF manquant',
        description: `Cette édition n'a pas de source_pdf_url. Ajoutez l'URL du PDF avant d'importer.`,
        variant: 'destructive',
      });
      return;
    }

    setIngesting(edition.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ingest-curriculum-edition', {
        body: { edition_id: edition.id },
      });

      if (fnError || data?.error) {
        const msg = data?.error ?? fnError?.message ?? 'Erreur inconnue';
        toast({ title: 'Erreur lors de l\'import', description: msg, variant: 'destructive' });
        return;
      }

      const { stats } = data;
      toast({
        title: `Import terminé — ${edition.bo_reference}`,
        description: `${stats.domains} domaines · ${stats.subdomains} sous-domaines · ${stats.objectives} objectifs · ${stats.success_criteria} critères`,
      });
      queryClient.invalidateQueries({ queryKey: ['curriculum-editions-admin'] });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message ?? String(err), variant: 'destructive' });
    } finally {
      setIngesting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-[22px] font-[800] text-[#0F172A]">Import des programmes officiels</h1>
        <p className="text-[15px] text-[#667085] mt-1">
          Extrait le contenu pédagogique des PDFs Bulletin Officiel via GPT-5 et l'enregistre dans la base.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-[#667085]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[15px]">Chargement des éditions…</span>
        </div>
      )}

      {error && (
        <div className="bg-[#FCEBEB] border border-[#F7C1C1] rounded-[14px] p-4 text-[#A32D2D] text-[15px]">
          Erreur lors du chargement : {(error as Error).message}
        </div>
      )}

      {editions && editions.length === 0 && (
        <div className="bg-[#F3F6FA] border border-[#EAECEF] rounded-[14px] p-6 text-center text-[#667085] text-[15px]">
          Aucune édition trouvée. La migration curriculum_versioning n'a peut-être pas été appliquée.
        </div>
      )}

      <div className="space-y-3">
        {(editions ?? []).map((edition) => {
          const isRunning = ingesting === edition.id;
          const hasContent = edition.domain_count > 0;
          const hasPdf = !!edition.source_pdf_url;

          return (
            <div
              key={edition.id}
              className="bg-white border border-[#EAECEF] rounded-[14px] p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-[700] text-[#0F172A] capitalize">{edition.subject}</span>
                  <span className="text-[13px] text-[#667085]">·</span>
                  <span className="text-[13px] text-[#667085]">{edition.cycle}</span>
                  <span
                    className={`text-[10px] font-[600] px-2 py-0.5 rounded-full border ${STATUS_COLORS[edition.status] ?? STATUS_COLORS.superseded}`}
                  >
                    {edition.status}
                  </span>
                </div>
                <div className="text-[13px] text-[#374151] mt-0.5">{edition.bo_reference}</div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {hasContent ? (
                    <span className="flex items-center gap-1 text-[12px] text-[#27500A]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {edition.domain_count} domaine{edition.domain_count > 1 ? 's' : ''} importé{edition.domain_count > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[12px] text-[#9CA3AF]">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Pas encore importé
                    </span>
                  )}
                  {!hasPdf && (
                    <span className="text-[12px] text-[#B45309]">PDF manquant</span>
                  )}
                  {edition.bo_url && (
                    <a
                      href={edition.bo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[12px] text-[#12C6A0] hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      BO
                    </a>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                disabled={isRunning || !hasPdf || hasContent}
                onClick={() => handleIngest(edition)}
                className={
                  hasContent
                    ? 'bg-[#F3F6FA] text-[#9CA3AF] border border-[#EAECEF] cursor-not-allowed'
                    : 'bg-[#12C6A0] text-white hover:bg-[#0F6E56]'
                }
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Import…
                  </>
                ) : hasContent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Fait
                  </>
                ) : (
                  <>
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Importer
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="bg-[#F2FBF8] border border-[#9FE1CB] rounded-[12px] p-4 text-[13px] text-[#0F6E56] space-y-1">
        <p className="font-[600]">Notes</p>
        <ul className="list-disc list-inside space-y-0.5 text-[#374151]">
          <li>L'import peut prendre 2-5 minutes par édition (traitement PDF par GPT-5).</li>
          <li>Les éditions avec statut <strong>projet</strong> n'ont pas de PDF — renseignez d'abord source_pdf_url dans Supabase.</li>
          <li>Pour reimporter une édition, supprimez d'abord ses domaines dans la table <code>domains</code>.</li>
          <li>Après import, vérifiez le contenu avant de passer le statut de l'édition à <strong>active</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
