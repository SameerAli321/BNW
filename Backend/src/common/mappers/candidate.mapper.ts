import { Candidate } from '../../entities/candidate.entity';

export interface CandidateDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  cvOriginalName: string;
  status: string;
  convertedUserId: number | null;
  /** Letters / contracts HR has prepared for this candidate (any status). */
  letterCount: number;
  uploadedBy: number;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Requires the `uploadedByUser` relation to be loaded for `uploadedByName` to resolve.
 * `letterCount` is counted separately by CandidatesService (0 when not passed).
 */
export function toCandidateDto(candidate: Candidate, letterCount = 0): CandidateDto {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    cvOriginalName: candidate.cvOriginalName,
    status: candidate.status,
    convertedUserId: candidate.convertedUserId,
    letterCount,
    uploadedBy: candidate.uploadedBy,
    uploadedByName: candidate.uploadedByUser
      ? `${candidate.uploadedByUser.firstName} ${candidate.uploadedByUser.lastName}`
      : '',
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
  };
}
