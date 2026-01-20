import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFlags, updateFlag, type FlagsResponse } from "@/lib/api";
import type { Connection } from "@/lib/connection";

export const flagsQueryKey = (endpoint: string) => ["flags", endpoint] as const;

export function useFlags(connection: Connection | null) {
  return useQuery({
    queryKey: connection ? flagsQueryKey(connection.endpoint) : ["flags"],
    queryFn: () => {
      if (!connection) throw new Error("No connection");
      return fetchFlags(connection);
    },
    enabled: !!connection,
  });
}

export function useToggleFlag(connection: Connection | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flag, value }: { flag: string; value: boolean }) => {
      if (!connection) throw new Error("No connection");
      await updateFlag(connection, flag, value);
      return { flag, value };
    },
    onMutate: async ({ flag, value }) => {
      if (!connection) return;

      const queryKey = flagsQueryKey(connection.endpoint);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<FlagsResponse>(queryKey);

      queryClient.setQueryData<FlagsResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          values: { ...old.values, [flag]: value },
        };
      });

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous && connection) {
        queryClient.setQueryData(flagsQueryKey(connection.endpoint), context.previous);
      }
    },
    onSettled: () => {
      if (connection) {
        queryClient.invalidateQueries({ queryKey: flagsQueryKey(connection.endpoint) });
      }
    },
  });
}
