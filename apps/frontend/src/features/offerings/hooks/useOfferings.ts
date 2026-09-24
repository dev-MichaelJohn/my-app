import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { IOfferingInsert, IOfferingUpdate } from "@my-app/shared";
import { OfferingAPI } from "../api/offering.api";
import { toQuery } from "@/lib/query.lib";

export const OFFERING_KEYS = {
  all: ["offerings"] as const,
  lists: () => [...OFFERING_KEYS.all, "list"] as const,
  list: (query?: unknown) => [...OFFERING_KEYS.lists(), query] as const,
  details: () => [...OFFERING_KEYS.all, "detail"] as const,
  detail: (id: number) => [...OFFERING_KEYS.details(), id] as const,
};

const offeringAPI = new OfferingAPI();

export const useOfferings = (query?: unknown) => {
  return useQuery({
    queryKey: OFFERING_KEYS.list(query),
    queryFn: () => toQuery(offeringAPI.getOfferings(query)),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOffering = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: OFFERING_KEYS.detail(id),
    queryFn: () => toQuery(offeringAPI.getOffering(id)),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOffering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newOffering: IOfferingInsert) => toQuery(offeringAPI.createOffering(newOffering)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.all });
    },
  });
};

export const useUpdateOffering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, info }: { id: number; info: IOfferingUpdate }) =>
      toQuery(offeringAPI.updateOffering(id, info)),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.all });
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.detail(id) });
    },
  });
};

export const useDeleteOffering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(offeringAPI.deleteOffering(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.all });
    },
  });
};

export const useRestoreOffering = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => toQuery(offeringAPI.restoreOffering(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.all });
    },
  });
};

export const useGenerateOfferings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (semesterId: number) => toQuery(offeringAPI.generateOfferings(semesterId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERING_KEYS.all });
    },
  });
};
