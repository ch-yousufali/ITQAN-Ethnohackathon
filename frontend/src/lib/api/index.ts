"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./http";
import {
  analysis,
  compound,
  finding,
  formulation,
  graph,
  interpretation,
  manuscript,
  plant,
  type FormulationInput,
  type ManuscriptPatch,
} from "./schemas";

const id = encodeURIComponent;

/* ---------- Formulations ---------- */

export function useFormulations() {
  return useQuery({
    queryKey: ["formulations"],
    queryFn: () => request("/formulations", z.array(formulation)),
  });
}

export function useFormulation(formulationId: string) {
  return useQuery({
    queryKey: ["formulations", formulationId],
    queryFn: () => request(`/formulations/${id(formulationId)}`, formulation),
  });
}

export function useSaveFormulation(formulationId?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: FormulationInput) =>
      formulationId
        ? request(`/formulations/${id(formulationId)}`, formulation, { method: "PUT", json: input })
        : request("/formulations", formulation, { method: "POST", json: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["formulations"] }),
  });
}

/* ---------- Manuscripts ---------- */

export function useManuscripts() {
  return useQuery({
    queryKey: ["manuscripts"],
    queryFn: () => request("/manuscripts", z.array(manuscript)),
    refetchInterval: (q) => (q.state.data?.some((m) => m.status === "processing") ? 1500 : false),
  });
}

export function useManuscript(manuscriptId: string) {
  return useQuery({
    queryKey: ["manuscripts", manuscriptId],
    queryFn: () => request(`/manuscripts/${id(manuscriptId)}`, manuscript),
    refetchInterval: (q) => (q.state.data?.status === "processing" ? 1500 : false),
  });
}

export function useUploadManuscript() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request("/manuscripts", manuscript, { method: "POST", form });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["manuscripts"] }),
  });
}

export function useUpdateManuscript(manuscriptId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ManuscriptPatch) =>
      request(`/manuscripts/${id(manuscriptId)}`, manuscript, { method: "PATCH", json: patch }),
    onSuccess: (data) => {
      client.setQueryData(["manuscripts", manuscriptId], data);
      return client.invalidateQueries({ queryKey: ["manuscripts"], exact: true });
    },
  });
}

export function useConfirmManuscript(manuscriptId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; tradition: string; period: string }) =>
      request(`/manuscripts/${id(manuscriptId)}/confirm`, formulation, { method: "POST", json: input }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ["manuscripts"] }),
        client.invalidateQueries({ queryKey: ["formulations"] }),
      ]),
  });
}

/* ---------- Plants & compounds ---------- */

export function usePlants() {
  return useQuery({ queryKey: ["plants"], queryFn: () => request("/plants", z.array(plant)) });
}

export function usePlant(plantId: string) {
  return useQuery({
    queryKey: ["plants", plantId],
    queryFn: () => request(`/plants/${id(plantId)}`, plant),
  });
}

export function useCompound(compoundId: string | null) {
  return useQuery({
    queryKey: ["compounds", compoundId],
    queryFn: () => request(`/compounds/${id(compoundId ?? "")}`, compound),
    enabled: compoundId !== null,
  });
}

/* ---------- Analyses & findings ---------- */

const isActive = (status?: string) => status === "queued" || status === "running";

export function useAnalyses() {
  return useQuery({
    queryKey: ["analyses"],
    queryFn: () => request("/analyses", z.array(analysis)),
    refetchInterval: (q) => (q.state.data?.some((a) => isActive(a.status)) ? 1500 : false),
  });
}

export function useRunAnalysis() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (formulationId: string) =>
      request(`/formulations/${id(formulationId)}/analyses`, analysis, { method: "POST" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["analyses"] }),
  });
}

export function useFindings(analysisId: string | null) {
  return useQuery({
    queryKey: ["findings", { analysisId }],
    queryFn: () => request(`/analyses/${id(analysisId ?? "")}/findings`, z.array(finding)),
    enabled: analysisId !== null,
  });
}

export function useFinding(findingId: string) {
  return useQuery({
    queryKey: ["finding", findingId],
    queryFn: () => request(`/findings/${id(findingId)}`, finding),
  });
}

export function useInterpretation(findingId: string) {
  return useMutation({
    mutationFn: () =>
      request(`/findings/${id(findingId)}/interpretation`, interpretation, { method: "POST" }),
  });
}

/* ---------- Knowledge graph ---------- */

export function useGraph(analysisId: string | null) {
  return useQuery({
    queryKey: ["graph", { analysisId }],
    queryFn: () => request(analysisId ? `/graph?analysis_id=${id(analysisId)}` : "/graph", graph),
  });
}
