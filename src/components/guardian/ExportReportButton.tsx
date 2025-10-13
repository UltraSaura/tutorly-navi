import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ExportReportButtonProps {
  childId: string;
  childName: string;
}

export const ExportReportButton = ({ childId, childName }: ExportReportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-guardian-report', {
        body: { childId, format: 'csv' }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${childName.replace(/\s+/g, '-')}-progress-report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report exported',
        description: 'Progress report downloaded successfully',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Could not generate report',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
    >
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
};
