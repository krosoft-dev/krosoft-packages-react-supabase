import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";

type SupabaseQueryFn<T> = () => Promise<{ data: T | null; error: PostgrestError | null }>;

export const useSupabaseQuery = <T>(
  queryKey: readonly unknown[],
  queryFn: SupabaseQueryFn<T>,
  enabled = true,
): UseQueryResult<T, Error> => {
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn();
      if (error) {
        throw new Error(error.message);
      }
      if (data === null) {
        throw new Error("No data returned");
      }
      return data;
    },
    enabled,
  });
};
