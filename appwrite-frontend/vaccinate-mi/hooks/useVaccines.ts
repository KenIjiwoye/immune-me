import { useQuery } from '@tanstack/react-query';
import { vaccinesService } from '../services/vaccinesService';
import { vaccineKeys } from './useVaccinesMutations';

/**
 * Hook to fetch active vaccines
 */
export function useActiveVaccines(limit: number = 100) {
    return useQuery({
        queryKey: [...vaccineKeys.active(), limit],
        queryFn: () => vaccinesService.getActive(limit),
    });
}

/**
 * Hook to fetch all vaccines (active and inactive)
 * Note: This is a placeholder if we need it later, for now we reuse getActive logic or add getAll to service
 */
// export function useVaccines(limit: number = 100) { ... }
