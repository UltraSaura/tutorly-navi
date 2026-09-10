import { useLocale } from '@/i18n/useLocale';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChildInfo {
  id: string;
  user_id: string;
  firstName: string;
  lastName: string;
  grade: string | null;
  status: string;
}

interface ResultsFilterProps {
  children: ChildInfo[];
  selectedChild: string;
  onChildChange: (childId: string) => void;
  subjectFilter: string;
  onSubjectChange: (subject: string) => void;
  correctnessFilter: string;
  onCorrectnessChange: (correctness: string) => void;
  dateFrom: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  onDateToChange: (date: Date | undefined) => void;
  onReset: () => void;
}

export default function ResultsFilter({
  children,
  selectedChild,
  onChildChange,
  subjectFilter,
  onSubjectChange,
  correctnessFilter,
  onCorrectnessChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onReset,
}: ResultsFilterProps) {
  const { locale, dateLocale } = useLocale();
  const ui = useInterfaceTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-2">
        <Label>{ui("Child")}</Label>
        <Select value={selectedChild} onValueChange={onChildChange}>
          <SelectTrigger>
            <SelectValue placeholder={ui("All children")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui("All Children")}</SelectItem>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.firstName} {child.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{ui("Subject")}</Label>
        <Select value={subjectFilter} onValueChange={onSubjectChange}>
          <SelectTrigger>
            <SelectValue placeholder={ui("All subjects")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui("All Subjects")}</SelectItem>
            <SelectItem value="math">{ui("Math")}</SelectItem>
            <SelectItem value="science">{ui("Science")}</SelectItem>
            <SelectItem value="english">{ui("English")}</SelectItem>
            <SelectItem value="history">{ui("History")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{ui("Status")}</Label>
        <Select value={correctnessFilter} onValueChange={onCorrectnessChange}>
          <SelectTrigger>
            <SelectValue placeholder={ui("All")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui("All")}</SelectItem>
            <SelectItem value="correct">{ui("Correct Only")}</SelectItem>
            <SelectItem value="incorrect">{ui("Incorrect Only")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{ui("From Date")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'PPP', { locale: dateLocale }) : ui("Pick a date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={onDateFromChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>{ui("To Date")}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'PPP', { locale: dateLocale }) : ui("Pick a date")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={onDateToChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-end">
        <Button variant="outline" onClick={onReset} className="w-full">
          {ui("Reset Filters")}
        </Button>
      </div>
    </div>
  );
}
