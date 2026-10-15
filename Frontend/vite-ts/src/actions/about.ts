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
  message: string;
  /** Relative to the API base — use avatarSrc() for an <img>. */
  photoUrl: string | null;
  hasCustomPhoto: boolean;
}

export interface AboutDto {
  company: AboutCompany;
  ceo: AboutCeo;
  updatedAt: string | null;
  updatedByName: string | null;
}

export type AboutPayload = {
  company: AboutCompany;
  ceo: { name: string; title: string; message: string };
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
