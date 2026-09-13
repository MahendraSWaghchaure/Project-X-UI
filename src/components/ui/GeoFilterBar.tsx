import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCountries, listDistricts, listRegions, listStates, searchDistricts } from '@/lib/api/geo';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toastStore';

export interface GeoSelection {
  countryId?: number;
  stateId?: number;
  regionId?: number;
  districtId?: number;
}

interface GeoFilterBarProps {
  value: GeoSelection;
  onChange: (selection: GeoSelection) => void;
  /** Label for the deepest, always-present level (e.g. "District" for schools, "Route" for a school's own fleet). */
  districtLabel?: string;
}

export function GeoFilterBar({ value, onChange, districtLabel = 'District' }: GeoFilterBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: countries } = useQuery({ queryKey: ['geo', 'countries'], queryFn: listCountries });
  const { data: states } = useQuery({
    queryKey: ['geo', 'states', value.countryId],
    queryFn: () => listStates(value.countryId!),
    enabled: !!value.countryId,
  });
  const { data: regions } = useQuery({
    queryKey: ['geo', 'regions', value.stateId],
    queryFn: () => listRegions(value.stateId!),
    enabled: !!value.stateId,
  });
  const { data: districts } = useQuery({
    queryKey: ['geo', 'districts', value.stateId, value.regionId],
    queryFn: () => listDistricts({ stateId: value.stateId, regionId: value.regionId }),
    enabled: !!value.stateId,
  });

  async function handleSearch() {
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const results = await searchDistricts(query);
      const match = results[0];
      if (!match) {
        toast.error(`No ${districtLabel.toLowerCase()} matching "${query}"`);
        return;
      }
      onChange({
        countryId: match.countryId,
        stateId: match.stateId,
        regionId: match.regionId ?? undefined,
        districtId: match.id,
      });
      setSearchOpen(false);
      setSearchQuery('');
    } catch {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  }

  const hasSelection = !!(value.countryId || value.stateId || value.regionId || value.districtId);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <Select
        label="Country"
        value={value.countryId ?? ''}
        onChange={(e) => {
          const countryId = e.target.value ? Number(e.target.value) : undefined;
          onChange({ countryId });
        }}
      >
        <option value="">All countries</option>
        {countries?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Select
        label="State"
        value={value.stateId ?? ''}
        disabled={!value.countryId}
        onChange={(e) => {
          const stateId = e.target.value ? Number(e.target.value) : undefined;
          onChange({ ...value, stateId, regionId: undefined, districtId: undefined });
        }}
      >
        <option value="">All states</option>
        {states?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>

      <Select
        label="Region"
        value={value.regionId ?? ''}
        disabled={!value.stateId}
        onChange={(e) => {
          const regionId = e.target.value ? Number(e.target.value) : undefined;
          onChange({ ...value, regionId, districtId: undefined });
        }}
      >
        <option value="">All regions</option>
        {regions?.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">{districtLabel}</span>
          {!searchOpen && (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Search instead
            </button>
          )}
        </div>
        {searchOpen ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder={`e.g. Pune`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
            />
            <Button type="button" isLoading={isSearching} onClick={handleSearch}>
              Search
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Select
            value={value.districtId ?? ''}
            disabled={!value.stateId}
            onChange={(e) => {
              const districtId = e.target.value ? Number(e.target.value) : undefined;
              onChange({ ...value, districtId });
            }}
          >
            <option value="">{`All ${districtLabel.toLowerCase()}s`}</option>
            {districts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {hasSelection && (
        <Button type="button" variant="secondary" onClick={() => onChange({})}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
