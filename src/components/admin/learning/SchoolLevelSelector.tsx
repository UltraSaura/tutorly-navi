import { useSchoolLevelsByCountry, SchoolLevelWithAge } from '@/hooks/useSchoolLevelsByCountry';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SchoolLevelSelectorProps {
  selectedLevels: string[];
  onLevelsChange: (levels: string[]) => void;
}

export function SchoolLevelSelector({ selectedLevels, onLevelsChange }: SchoolLevelSelectorProps) {
  const { data: countries, isLoading } = useSchoolLevelsByCountry();
  const [ageFilter, setAgeFilter] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const toggleLevel = (levelCode: string, countryCode: string) => {
    // Create unique identifier: country_code:level_code
    const fullLevelCode = `${countryCode}:${levelCode}`;
    const isSelected = selectedLevels.includes(fullLevelCode);

    if (isSelected) {
      onLevelsChange(selectedLevels.filter(l => l !== fullLevelCode));
    } else {
      onLevelsChange([...selectedLevels, fullLevelCode]);
    }
  };

  const getLevelIdentifier = (levelCode: string, countryCode: string): string => {
    return `${countryCode}:${levelCode}`;
  };

  const isLevelSelected = (levelCode: string, countryCode: string): boolean => {
    return selectedLevels.includes(getLevelIdentifier(levelCode, countryCode));
  };

  // Filter countries by age and search
  const filteredCountries = countries?.filter(country => {
    const matchingLevels = country.levels.filter(level => {
      const matchesAge = !ageFilter || 
        (level.ageRange[0] <= parseInt(ageFilter) && level.ageRange[1] >= parseInt(ageFilter));
      
      const matchesSearch = !searchFilter ||
        level.level_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        country.name.toLowerCase().includes(searchFilter.toLowerCase());

      return matchesAge && matchesSearch;
    });

    return matchingLevels.length > 0;
  }).map(country => ({
    ...country,
    levels: country.levels.filter(level => {
      const matchesAge = !ageFilter || 
        (level.ageRange[0] <= parseInt(ageFilter) && level.ageRange[1] >= parseInt(ageFilter));
      
      const matchesSearch = !searchFilter ||
        level.level_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        country.name.toLowerCase().includes(searchFilter.toLowerCase());

      return matchesAge && matchesSearch;
    }),
  })) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by country or level name..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="number"
          placeholder="Filter by age (e.g., 10)"
          min="0"
          max="18"
          value={ageFilter}
          onChange={(e) => setAgeFilter(e.target.value)}
        />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Select school levels by checking boxes. Each level shows its approximate age range. 
          Selected levels are stored as <code className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">country_code:level_code</code>.
        </p>
      </div>

      {/* Table */}
      <ScrollArea className="h-[500px] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[200px]">Country</TableHead>
              <TableHead>School Levels (with age ranges)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCountries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No school levels found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredCountries.map((country) => (
                <TableRow key={country.code}>
                  <TableCell className="font-medium align-top pt-4">
                    {country.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-3">
                      {country.levels.map((level) => {
                        const levelId = getLevelIdentifier(level.level_code, level.country_code);
                        const isSelected = isLevelSelected(level.level_code, level.country_code);
                        
                        return (
                          <div
                            key={level.id}
                            className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted transition-colors"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleLevel(level.level_code, level.country_code)}
                              id={levelId}
                            />
                            <Label
                              htmlFor={levelId}
                              className="text-sm cursor-pointer flex items-center gap-2"
                            >
                              <span className="font-medium">{level.level_name}</span>
                              <Badge variant="outline" className="text-xs">
                                Ages {level.ageRange[0]}-{level.ageRange[1]}
                              </Badge>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Selected count */}
      <div className="text-sm text-muted-foreground">
        {selectedLevels.length > 0 ? (
          <span>
            <strong>{selectedLevels.length}</strong> level{selectedLevels.length !== 1 ? 's' : ''} selected
          </span>
        ) : (
          <span>No levels selected (video will be visible to all ages/levels)</span>
        )}
      </div>
    </div>
  );
}
