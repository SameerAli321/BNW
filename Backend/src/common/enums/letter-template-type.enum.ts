export enum LetterTemplateType {
  OFFER = 'OFFER',
  CONTRACT = 'CONTRACT',
  REDUNDANCY = 'REDUNDANCY',
  TERMS_CHANGE = 'TERMS_CHANGE',
  WARNING = 'WARNING',
  EXPERIENCE = 'EXPERIENCE',
  // Sent by HR once an appraisal reaches a final CEO decision (CEO_ACCEPTED/CEO_REJECTED) — see
  // docs/API_CONTRACT_SPRINT4.md addendum. Goes through the same Letter Engine flow as every other
  // type (draft -> CEO sign -> send to employee -> E-record), not a special case.
  APPRECIATION = 'APPRECIATION',
  APPRAISAL_REJECTION = 'APPRAISAL_REJECTION',
}
