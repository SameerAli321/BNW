// ----------------------------------------------------------------------
// BNW OMS — Sprint 4 types, mirroring docs/API_CONTRACT_SPRINT4.md exactly (employee-initiated
// quarterly appraisal request flow — see that doc's "Deviation from the original guide" section;
// this is NOT the HR-scheduled cycle model from the original project guide §3.2/§5.2). Keep in
// sync with the contract; if either side needs to change this shape, update the contract doc
// first. Companion file to src/types/user.ts / employee-record.ts / letter.ts, not merged into
// any of them.

export type AppraisalStatus =
  | 'PENDING_MANAGER'
  | 'MANAGER_REJECTED'
  | 'PENDING_CEO'
  | 'CEO_ACCEPTED'
  | 'CEO_REJECTED';

export const APPRAISAL_STATUS_OPTIONS: AppraisalStatus[] = [
  'PENDING_MANAGER',
  'MANAGER_REJECTED',
  'PENDING_CEO',
  'CEO_ACCEPTED',
  'CEO_REJECTED',
];

export type AppraisalManagerDecision = 'ACCEPTED' | 'REJECTED';

export type AppraisalCeoDecision = 'ACCEPTED' | 'REJECTED' | 'SEND_BACK';

export type AppraisalEventAction =
  | 'SUBMITTED'
  | 'MANAGER_ACCEPTED'
  | 'MANAGER_REJECTED'
  | 'CEO_ACCEPTED'
  | 'CEO_REJECTED'
  | 'CEO_SENT_BACK';

/** `AppraisalEventDto` — contract §DTOs. One row of an appraisal's append-only audit trail. */
export interface AppraisalEventDto {
  id: number;
  action: AppraisalEventAction;
  actorId: number;
  actorName: string;
  message: string | null;
  createdAt: string;
}

/** `AppraisalRequestDto` — contract §DTOs. `events` is only present on `GET /appraisal-requests/:id`. */
export interface AppraisalRequestDto {
  id: number;
  employeeId: number;
  employeeName: string;
  managerId: number | null;
  managerName: string | null;
  selfEvaluation: string;
  /** Full Self Evaluation Form; `null` for requests made before the form existed. */
  selfEvaluationForm: SelfEvaluationForm | null;
  status: AppraisalStatus;
  managerRemarks: string | null;
  managerMessage: string | null;
  managerDecision: AppraisalManagerDecision | null;
  managerDecidedAt: string | null;
  ceoRemarks: string | null;
  ceoMessage: string | null;
  ceoDecision: AppraisalCeoDecision | null;
  ceoDecidedAt: string | null;
  submittedAt: string;
  events?: AppraisalEventDto[];
}

/** `POST /appraisal-requests` body — the caller's own Self Evaluation Form. */
export type CreateAppraisalRequestDto = { form: SelfEvaluationForm };

// ----------------------------------------------------------------------
// Self Evaluation Form — mirrors Backend/src/appraisals/self-evaluation-form.ts. Keep in sync.

export type AppraisalRating = 'GROWTH_SUPPORT_REQUIRED' | 'DEVELOPING' | 'STRONG' | 'EXCEPTIONAL';

/** The form's 4-step scale, lowest to highest. */
export const APPRAISAL_RATING_OPTIONS: { value: AppraisalRating; label: string }[] = [
  { value: 'GROWTH_SUPPORT_REQUIRED', label: 'Growth and Support Required' },
  { value: 'DEVELOPING', label: 'Developing Performance' },
  { value: 'STRONG', label: 'Strong Performance' },
  { value: 'EXCEPTIONAL', label: 'Exceptional' },
];

export type SelfEvaluationCompetency =
  | 'TECHNICAL_KNOWLEDGE'
  | 'QUALITY_OF_WORK'
  | 'CONTINUOUS_LEARNING'
  | 'COMMUNICATION'
  | 'STAKEHOLDER_MANAGEMENT'
  | 'PROFESSIONALISM'
  | 'CONFLICT_RESOLUTION'
  | 'TASK_COMPLETION'
  | 'EFFICIENCY_IMPROVEMENT'
  | 'DECISION_MAKING';

/** "Assess Yourself" — in the order the form asks them, wording as on the original form. */
export const SELF_EVALUATION_COMPETENCIES: {
  key: SelfEvaluationCompetency;
  title: string;
  description: string;
}[] = [
  {
    key: 'TECHNICAL_KNOWLEDGE',
    title: 'Technical Knowledge',
    description:
      'Assessed through problem-solving, innovation, and ability to mentor team members.',
  },
  {
    key: 'QUALITY_OF_WORK',
    title: 'Quality of Work Produced',
    description: 'Accuracy, efficiency, and adherence to best practices.',
  },
  { key: 'CONTINUOUS_LEARNING', title: 'Continuous Learning & Skill Development', description: '' },
  {
    key: 'COMMUNICATION',
    title: 'Clarity in Communication',
    description: 'Ability to convey information clearly to the team and stakeholders.',
  },
  {
    key: 'STAKEHOLDER_MANAGEMENT',
    title: 'Stakeholder Management',
    description:
      'Effectiveness in managing expectations with clients, senior management, and cross-functional teams.',
  },
  {
    key: 'PROFESSIONALISM',
    title: 'Professionalism',
    description:
      'Has the ability to develop, communicate and achieve realistic, time-bounded and long term goals.',
  },
  {
    key: 'CONFLICT_RESOLUTION',
    title: 'Conflict Resolution',
    description: 'Ability to handle disputes and maintain a positive work environment.',
  },
  {
    key: 'TASK_COMPLETION',
    title: 'Project/Task Completion Rate',
    description: 'Percentage of assigned tasks completed within deadlines.',
  },
  {
    key: 'EFFICIENCY_IMPROVEMENT',
    title: 'Efficiency Improvement',
    description: 'Contribution to process improvements or automation.',
  },
  {
    key: 'DECISION_MAKING',
    title: 'Accuracy of Decision-Making',
    description: 'Timely and well-informed decisions that align with business objectives.',
  },
];

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
  lineManager: { name: string; designation: string };
  duration: {
    appraisalYear: string;
    /** 'YYYY-MM-DD' */
    evaluationFrom: string;
    /** 'YYYY-MM-DD' */
    evaluationTo: string;
  };
  assessments: { competency: SelfEvaluationCompetency; rating: AppraisalRating; reason: string }[];
  summaryRemarks: string;
}

/** `GET /appraisal-requests/form-defaults` — pre-fill values from the caller's own records. */
export interface SelfEvaluationFormDefaults {
  employee: Pick<
    SelfEvaluationForm['employee'],
    'name' | 'jobTitle' | 'contactNumber' | 'email' | 'department'
  >;
  lineManager: SelfEvaluationForm['lineManager'];
}

/** `POST /appraisal-requests/:id/manager-decision` body — the request's `managerId` only. */
export type ManagerDecisionDto = {
  remarks: string;
  message: string;
  decision: AppraisalManagerDecision;
};

/** `POST /appraisal-requests/:id/ceo-decision` body — CEO only. */
export type CeoDecisionDto = {
  remarks: string;
  message: string;
  decision: AppraisalCeoDecision;
};

export type MyAppraisalsMeta = { canRequestNext: boolean; nextEligibleDate: string | null };

/** `MyAppraisalsResponseDto` — contract §DTOs, the shape of `GET /appraisal-requests/mine`. */
export interface MyAppraisalsResponseDto {
  data: AppraisalRequestDto[];
  meta: MyAppraisalsMeta;
}

export type IAppraisalListMeta = { total: number; page: number; limit: number };

export type IAppraisalTableFilters = { status: string };
