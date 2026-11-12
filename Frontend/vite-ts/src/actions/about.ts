import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — About us. Mirrors Backend/src/about. Everyone reads it; CEO / HR / ADMIN edit it.

export const ABOUT_EDITOR_ROLES = ['CEO', 'HR', 'ADMIN'];

export interface AboutCompany {
  name: string;
  tagline: string;
  about: string;
  mission: string;
  vision: string;
  services: string[];
  address: string;
  phones: string[];
  email: string;
  website: string;
}

export interface AboutCeo {
  name: string;
  title: string;
  /** Short headline shown large; empty = the message's first sentence. */
  quote: string;
  message: string;
  /** Relative to the API base — use avatarSrc() for an <img>. */
  photoUrl: string | null;
  hasCustomPhoto: boolean;
}

/** A titled card in the story: a service, a firm, a principle, an expectation. */
export type StoryItem = { title: string; text: string };
/** A dated step on the "Our Journey" timeline. */
export type StoryMilestone = { date: string; title: string; text: string };

/**
 * The "What is BNW" story (Backend/src/about/about-story.ts) — every section editable by CEO / HR
 * / Admin. Long texts are plain strings; a blank line starts a new paragraph.
 */
export interface AboutStory {
  welcomeTitle: string;
  welcomeSubtitle: string;
  whoWeAre: string;
  vision: string;
  mission: string;
  servicesIntro: string;
  services: StoryItem[];
  servicesOutro: string;
  groupIntro: string;
  firms: StoryItem[];
  groupMotto: string;
  groupText: string;
  philosophyIntro: string;
  principles: StoryItem[];
  culture: string;
  expectationsIntro: string;
  expectations: StoryItem[];
  expectationsOutro: string;
  commitment: string;
  journeyIntro: string;
  milestones: StoryMilestone[];
  journeyOutro: string;
  yourRole: string;
}

export interface AboutDto {
  company: AboutCompany;
  ceo: AboutCeo;
  story: AboutStory;
  updatedAt: string | null;
  updatedByName: string | null;
}

export type AboutPayload = {
  company: AboutCompany;
  ceo: { name: string; title: string; quote: string; message: string };
  story: AboutStory;
};

export function useGetAbout() {
  // The API wraps it as { data }.
  const { data, isLoading, error } = useSWR<{ data: AboutDto }>(endpoints.about.root, fetcher, {
    revalidateOnFocus: false,
  });
  return useMemo(
    () => ({ about: data?.data, aboutLoading: isLoading, aboutError: error }),
    [data, isLoading, error]
  );
}

async function store(promise: Promise<{ data: { data: AboutDto } }>): Promise<AboutDto> {
  const res = await promise;
  await mutate(endpoints.about.root, res.data, false);
  return res.data.data;
}

export function updateAbout(payload: AboutPayload) {
  return store(axiosInstance.put(endpoints.about.root, payload));
}

export function uploadCeoPhoto(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return store(
    axiosInstance.post(endpoints.about.ceoPhoto, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
}

export function removeCeoPhoto() {
  return store(axiosInstance.delete(endpoints.about.ceoPhoto));
}

// ----------------------------------------------------------------------
// Employee Policy Handbook acknowledgements (Backend/src/about/policy.service.ts). Everyone signs
// their own; it goes to their manager and HR. CEO / HR / ADMIN see everyone's, Team Leads their
// team's; HR / ADMIN can remind people who haven't signed.

export const POLICY_ACKS_VIEWER_ROLES = ['CEO', 'HR', 'ADMIN', 'MANAGER'];
export const POLICY_REMINDER_ROLES = ['HR', 'ADMIN'];

export interface MyPolicyAcknowledgement {
  version: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  signatureText: string | null;
  sentTo: string[];
  /** Who it will be sent to, e.g. ['Sara Khan (your manager)', 'HR']. */
  recipients: string[];
}

export interface PolicyAcknowledgementRow {
  userId: number;
  name: string;
  employeeCode: string | null;
  designation: string | null;
  department: string | null;
  managerName: string | null;
  acknowledgedAt: string | null;
  signatureText: string | null;
}

type PolicyAcksResponse = {
  version: string;
  data: PolicyAcknowledgementRow[];
  summary: { total: number; acknowledged: number; pending: number };
};

export function useGetMyPolicyAcknowledgement() {
  const { data, isLoading } = useSWR<{ data: MyPolicyAcknowledgement }>(
    endpoints.about.myPolicyAck,
    fetcher
  );
  return useMemo(() => ({ ack: data?.data, ackLoading: isLoading }), [data, isLoading]);
}

export function useGetPolicyAcknowledgements(enabled: boolean) {
  const { data, isLoading } = useSWR<PolicyAcksResponse>(
    enabled ? endpoints.about.policyAcks : null,
    fetcher
  );
  return useMemo(
    () => ({
      rows: data?.data ?? [],
      summary: data?.summary,
      version: data?.version,
      rowsLoading: isLoading,
    }),
    [data, isLoading]
  );
}

export async function acknowledgePolicy(signatureText: string): Promise<MyPolicyAcknowledgement> {
  const res = await axiosInstance.post<{ data: MyPolicyAcknowledgement }>(
    endpoints.about.acknowledgePolicy,
    { signatureText }
  );
  await mutate(endpoints.about.myPolicyAck, res.data, false);
  await mutate(endpoints.about.policyAcks);
  return res.data.data;
}

/** Leave `userIds` out to remind everyone still pending. */
export async function remindPolicy(userIds?: number[]): Promise<number> {
  const res = await axiosInstance.post<{ data: { reminded: number } }>(
    endpoints.about.remindPolicy,
    { userIds }
  );
  return res.data.data.reminded;
}
