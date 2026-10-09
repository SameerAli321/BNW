import { AppraisalRating } from '../common/enums/appraisal-rating.enum';

/**
 * The BNW "Self Evaluation Form" (Assess Yourself section) — one entry per competency, in the order
 * the form asks them. `key` is what's stored; the frontend has a copy of this list for labels
 * (src/types/appraisal.ts) — keep the two in sync.
 */
export const SELF_EVALUATION_COMPETENCIES = [
  'TECHNICAL_KNOWLEDGE',
  'QUALITY_OF_WORK',
  'CONTINUOUS_LEARNING',
  'COMMUNICATION',
  'STAKEHOLDER_MANAGEMENT',
  'PROFESSIONALISM',
  'CONFLICT_RESOLUTION',
  'TASK_COMPLETION',
  'EFFICIENCY_IMPROVEMENT',
  'DECISION_MAKING',
] as const;

export type SelfEvaluationCompetency = (typeof SELF_EVALUATION_COMPETENCIES)[number];

/** Shape stored in `appraisal_requests.self_evaluation_form` (jsonb). */
export interface SelfEvaluationForm {
  employee: {
    location: string;
    projectDescription: string;
    name: string;
    jobTitle: string;
    contactNumber: string;
    email: string;
    department: string;
  };
  lineManager: {
    name: string;
    designation: string;
  };
  duration: {
    appraisalYear: string;
    evaluationFrom: string; // 'YYYY-MM-DD'
    evaluationTo: string; // 'YYYY-MM-DD'
  };
  assessments: {
    competency: SelfEvaluationCompetency;
    rating: AppraisalRating;
    reason: string;
  }[];
  summaryRemarks: string;
}

/** Pre-fill values for the form, from the caller's own user record, profile and manager. */
export interface SelfEvaluationFormDefaults {
  employee: Pick<
    SelfEvaluationForm['employee'],
    'name' | 'jobTitle' | 'contactNumber' | 'email' | 'department'
  >;
  lineManager: SelfEvaluationForm['lineManager'];
}
