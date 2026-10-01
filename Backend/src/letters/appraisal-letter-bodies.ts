/**
 * Bodies of the two appraisal-result letters, shared by seed.ts (fresh DBs) and the
 * AppraisalLetterBodies migration (existing DBs). Placeholders are filled at render time by
 * LetterPdfRendererService: `{{date}}` is the CEO signing date, `{{employee.fullName}}` the
 * letter's subject, and the rest come from the letter's fieldValues. The renderer appends the CEO
 * signature block after the closing "Warm regards," — so bodies end there.
 */

export const APPRECIATION_LETTER_NAME = 'Appreciation for Outstanding Performance';

// Owner-provided wording, verbatim from the "Appraisal Letter.pdf" they supplied (plus the
// appraisal amount line).
export const APPRECIATION_LETTER_BODY =
  '<p style="text-align:right">{{date}}</p>' +
  '<p><strong>Appreciation for Outstanding Performance</strong></p>' +
  '<p>Dear {{employee.fullName}},</p>' +
  '<p>I am pleased to write this letter to express our heartfelt appreciation for your ' +
  'exceptional performance and dedication during challenging times. Your ability to excel ' +
  'under pressure has been truly remarkable and has made a significant impact on our team ' +
  'and organization.</p>' +
  '<p>Throughout {{context}}, you consistently demonstrated resilience, resourcefulness, and ' +
  'a calm demeanor, which were instrumental in achieving our goals. Your positive attitude ' +
  'and proactive approach were inspiring to your colleagues and contributed immensely to our ' +
  'collective success.</p>' +
  '<p>Your capacity to handle high-pressure situations with professionalism and efficiency ' +
  'reflects not only your skills and experience but also your commitment to excellence. Your ' +
  'contributions have not gone unnoticed, and we are grateful for your unwavering dedication ' +
  'to delivering results, even under demanding circumstances.</p>' +
  '<p>We value your exceptional work ethic and the positive example you set for others in ' +
  'the team. Your ability to maintain focus and productivity during challenging times is a ' +
  "testament to your strong work ethic and dedication to our organization's success.</p>" +
  '<p>In recognition of your outstanding contributions, we are pleased to award you an ' +
  'appraisal amount of <strong>{{amount}}</strong>.</p>' +
  '<p>Please accept our sincere gratitude for your outstanding performance. We look forward ' +
  'to your continued contributions and success at BNW Consultants. Thank you once again for ' +
  'your hard work and dedication.</p>' +
  '<p>Warm regards,</p>';

export const APPRAISAL_REJECTION_LETTER_NAME = 'Appraisal Review Outcome';

export const APPRAISAL_REJECTION_LETTER_BODY =
  '<p style="text-align:right">{{date}}</p>' +
  '<p><strong>Appraisal Review Outcome</strong></p>' +
  '<p>Dear {{employee.fullName}},</p>' +
  '<p>Thank you for your efforts and contributions to BNW Consultants during the recent ' +
  'appraisal cycle. Following a careful review of your performance by your line manager and ' +
  'the management team, we regret to inform you that your appraisal has not been approved at ' +
  'this time.</p>' +
  '<p>Our review identified the following areas where your performance did not meet the ' +
  'expected standards:</p>' +
  '<p>{{feedback}}</p>' +
  '<p>We believe you have the potential to improve in these areas. Your manager will meet with ' +
  'you to agree on clear goals and a development plan, and will provide the guidance and ' +
  'support you need over the coming months. Your performance will be reviewed again in the ' +
  'next appraisal cycle.</p>' +
  '<p>We encourage you to view this as an opportunity for growth. We value your place in the ' +
  'team and look forward to seeing your progress at BNW Consultants.</p>' +
  '<p>Warm regards,</p>';
