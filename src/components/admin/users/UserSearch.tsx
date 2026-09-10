import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserSearchProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterUserType: string;
  onFilterUserTypeChange: (value: string) => void;
}

export const UserSearch = ({
  searchQuery,
  onSearchChange,
  filterUserType,
  onFilterUserTypeChange
}: UserSearchProps) => {
  const ui = useInterfaceTranslation();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={ui("Search by name, email, country...")}
          className="pl-8 w-full sm:w-[300px]"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Select value={filterUserType} onValueChange={onFilterUserTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={ui("User Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ui("All Types")}</SelectItem>
            <SelectItem value="student">{ui("Students")}</SelectItem>
            <SelectItem value="parent">{ui("Parents")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
