import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Analysis, AnalyzeRequest, AnalyzeResult, Contact, Session, Stats } from '@tennis/shared';
import { api } from '../lib/api';

// ---- Sessions ----

export interface SessionInput {
  date: string;
  durationMin: number;
  location?: string;
  surface: string;
  indoor?: boolean;
  type: string;
  feelRating?: number | null;
  energyRating?: number | null;
  funRating?: number | null;
  notes?: string;
  participants?: { contactId: string; role: string }[];
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get<Session[]>('/sessions')).data,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ['sessions', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Session>(`/sessions/${id}`)).data,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SessionInput) => (await api.post<Session>('/sessions', input)).data,
    onSuccess: () => invalidateSessionData(qc),
  });
}

export function useUpdateSession(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SessionInput>) =>
      (await api.patch<Session>(`/sessions/${id}`, input)).data,
    onSuccess: () => invalidateSessionData(qc),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/sessions/${id}`)).data,
    onSuccess: () => invalidateSessionData(qc),
  });
}

function invalidateSessionData(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['sessions'] });
  qc.invalidateQueries({ queryKey: ['stats'] });
}

// ---- Contacts ----

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get<Contact[]>('/contacts')).data,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; notes?: string }) =>
      (await api.post<Contact>('/contacts', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; notes?: string }) =>
      (await api.patch<Contact>(`/contacts/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/contacts/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

// ---- Stats ----

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<Stats>('/stats')).data,
  });
}

// ---- Coach ----

export function useAnalyzeShot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AnalyzeRequest) =>
      (await api.post<AnalyzeResult>('/coach/analyze', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses'] }),
  });
}

export function useAnalyses(sessionId?: string) {
  return useQuery({
    queryKey: ['analyses', sessionId ?? 'all'],
    queryFn: async () =>
      (await api.get<Analysis[]>('/coach/analyses', { params: sessionId ? { sessionId } : {} })).data,
  });
}

export function useDeleteAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/coach/analyses/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analyses'] }),
  });
}
