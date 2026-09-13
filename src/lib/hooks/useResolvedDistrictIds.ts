import { useQuery } from '@tanstack/react-query';
import { listDistricts, listStates } from '@/lib/api/geo';
import type { GeoSelection } from '@/components/ui/GeoFilterBar';

async function resolveCountryDistrictIds(countryId: number): Promise<number[]> {
  const states = await listStates(countryId);
  const districtLists = await Promise.all(states.map((s) => listDistricts({ stateId: s.id })));
  return districtLists.flat().map((d) => d.id);
}

/**
 * Turns a Country/State/Region/District selection into the concrete district ids to filter by.
 * A district pick is exact; a state/region pick expands to every district under it; a country-only
 * pick fans out across that country's states - acceptable given reference-data volume (a handful of
 * states/districts today), same tradeoff GeoService makes server-side for ancestor-chain resolution.
 */
export function useResolvedDistrictIds(selection: GeoSelection): { districtIds: number[]; isResolving: boolean } {
  const { countryId, stateId, regionId, districtId } = selection;

  const stateLevel = useQuery({
    queryKey: ['geo', 'resolve-state-districts', stateId, regionId],
    queryFn: () => listDistricts({ stateId, regionId }),
    enabled: !!stateId && !districtId,
  });

  const countryLevel = useQuery({
    queryKey: ['geo', 'resolve-country-districts', countryId],
    queryFn: () => resolveCountryDistrictIds(countryId!),
    enabled: !!countryId && !stateId,
  });

  if (districtId) return { districtIds: [districtId], isResolving: false };
  if (stateId) return { districtIds: (stateLevel.data ?? []).map((d) => d.id), isResolving: stateLevel.isLoading };
  if (countryId) return { districtIds: countryLevel.data ?? [], isResolving: countryLevel.isLoading };
  return { districtIds: [], isResolving: false };
}
