import type { SWRConfiguration } from 'swr';

import { useMemo } from 'react';
import useSWR, { mutate } from 'swr';

import axiosInstance, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
// BNW OMS — interview scheduling + outgoing email. Mirrors Backend/src/interviews and
// Backend/src/mail. All interview dates/times are Pakistan time (PKT).

export type InterviewMode = 'ONLINE' | 'IN_PERSON' | 'PHONE';
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type InterviewEmailStatus = 'SENT' | 'FAILED' | 'NOT_CONFIGURED';

export const INTERVIEW_MODE_LABEL: Record<InterviewMode, string> = {
  ONLINE: 'Online (video call)',
  IN_PERSON: 'In person',
  PHONE: 'Phone call',
};

export interface InterviewDto {
  id: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  scheduledAt: string; // ISO instant
  date: string; // 'YYYY-MM-DD', Pakistan time
  time: string; // 'HH:mm', Pakistan time
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink: string | null;
  location: string | null;
  interviewers: { id: number; name: string; email: string }[];
  message: string | null;
  status: InterviewStatus;
  cancelReason: string | null;
  emailStatus: InterviewEmailStatus | null;
  emailError: string | null;
  emailSentAt: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleInterviewPayload = {
  date: string;
  time: string;
  durationMinutes: number;
  mode: InterviewMode;
  meetingLink?: string | null;
  location?: string | null;
  interviewerIds?: number[];
  message?: string | null;
  /** Reschedule only — false saves without re-emailing. */
  notify?: boolean;
};

export type EmailPreview = { subject: string; html: string; text: string };

export type MailStatus = {
  configured: boolean;
  connected: boolean;
  error: string | null;
  from: string | null;
};

const swrOptions: SWRConfiguration = {
  revalidateIfStale: true,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/** Every cached interview list (candidate history, upcoming) refreshes after a change. */
const revalidateInterviews = () =>
  mutate((key) => {
    const url = Array.isArray(key) ? key[0] : key;
    return typeof url === 'string' && url.includes('/interviews');
  });

// ----------------------------------------------------------------------

/** GET /interviews?upcoming=true — scheduled interviews that haven't happened yet. */
export function useGetUpcomingInterviews(enabled = true) {
  const { data, isLoading } = useSWR<{ data: InterviewDto[] }>(
    enabled ? [endpoints.interviews.list, { params: { upcoming: 'true' } }] : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ upcomingInterviews: data?.data || [], upcomingInterviewsLoading: isLoading }),
    [data?.data, isLoading]
  );
}

/** GET /candidates/:id/interviews — one candidate's interview history, newest first. */
export function useGetCandidateInterviews(candidateId?: number) {
  const { data, isLoading } = useSWR<{ data: InterviewDto[] }>(
    candidateId ? endpoints.interviews.forCandidate(candidateId) : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ interviews: data?.data || [], interviewsLoading: isLoading }),
    [data?.data, isLoading]
  );
}

export async function previewInterviewEmail(
  candidateId: number,
  payload: ScheduleInterviewPayload
): Promise<EmailPreview> {
  const res = await axiosInstance.post(endpoints.interviews.preview(candidateId), payload);
  return res.data.data;
}

export async function scheduleInterview(
  candidateId: number,
  payload: ScheduleInterviewPayload
): Promise<InterviewDto> {
  const res = await axiosInstance.post(endpoints.interviews.forCandidate(candidateId), payload);
  await revalidateInterviews();
  return res.data.data;
}

export async function rescheduleInterview(
  id: number,
  payload: ScheduleInterviewPayload
): Promise<InterviewDto> {
  const res = await axiosInstance.patch(endpoints.interviews.details(id), payload);
  await revalidateInterviews();
  return res.data.data;
}

export async function cancelInterview(
  id: number,
  payload: { reason?: string; notify?: boolean }
): Promise<InterviewDto> {
  const res = await axiosInstance.post(endpoints.interviews.cancel(id), payload);
  await revalidateInterviews();
  return res.data.data;
}

export async function resendInterviewInvite(id: number): Promise<InterviewDto> {
  const res = await axiosInstance.post(endpoints.interviews.resend(id));
  await revalidateInterviews();
  return res.data.data;
}

export async function setInterviewOutcome(
  id: number,
  status: 'COMPLETED' | 'NO_SHOW'
): Promise<InterviewDto> {
  const res = await axiosInstance.post(endpoints.interviews.outcome(id), { status });
  await revalidateInterviews();
  return res.data.data;
}

// ----------------------------------------------------------------------
// Outgoing email

/** GET /mail/status — is SMTP set up, and can the server log in to it? */
export function useGetMailStatus(enabled = true) {
  const { data, isLoading, mutate: refresh } = useSWR<{ data: MailStatus }>(
    enabled ? endpoints.smtp.status : null,
    fetcher,
    swrOptions
  );
  return useMemo(
    () => ({ mailStatus: data?.data, mailStatusLoading: isLoading, refreshMailStatus: refresh }),
    [data?.data, isLoading, refresh]
  );
}

/** POST /mail/test — ADMIN. Resolves with the send result ({ status: 'SENT' | 'FAILED' | … }). */
export async function sendTestEmail(
  to: string
): Promise<{ status: InterviewEmailStatus; error?: string }> {
  const res = await axiosInstance.post(endpoints.smtp.test, { to });
  return res.data.data;
}
