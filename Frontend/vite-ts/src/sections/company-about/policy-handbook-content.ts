import type { IconifyName } from 'src/components/iconify';

// ----------------------------------------------------------------------
// BNW Employee Policy Handbook — the text shown on the About us page, as supplied by the client.
// When this text changes, bump POLICY_VERSION in Backend/src/about/policy.service.ts so everyone
// is asked to acknowledge the new version.

export type PolicyBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  /** A key fact pulled out so it stands out (working hours, leave year…). */
  | { kind: 'highlight'; title: string; text: string };

export type PolicySubsection = { id: string; number: string; title: string; blocks: PolicyBlock[] };

export type PolicySection = {
  id: string;
  number: string;
  title: string;
  icon: IconifyName;
  /** One line shown on the topic card, so a new joiner knows what's inside before opening it. */
  summary: string;
  blocks: PolicyBlock[];
  subsections?: PolicySubsection[];
};

export const POLICY_HANDBOOK_TITLE = 'BNW Employee Policy Handbook';

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'introduction',
    number: '1',
    title: 'Introduction and Purpose',
    icon: 'solar:info-circle-bold',
    summary: 'What this handbook is and why it matters.',
    blocks: [
      {
        kind: 'p',
        text: 'All employees are expected to read this handbook, follow the applicable policies and seek clarification from HR where necessary.',
      },
    ],
  },
  {
    id: 'responsibilities',
    number: '2',
    title: 'Employee Responsibilities and Prevention of Harassment',
    icon: 'solar:users-group-rounded-bold',
    summary: 'How we treat each other, and how to raise a concern safely.',
    blocks: [],
    subsections: [
      {
        id: 'responsibilities-employee',
        number: '2.1',
        title: 'Employee Responsibilities',
        blocks: [
          { kind: 'p', text: 'Employees must:' },
          {
            kind: 'list',
            items: [
              'Treat colleagues, clients, suppliers and visitors respectfully.',
              'Avoid offensive, threatening, discriminatory or humiliating behaviour.',
              'Respect different backgrounds, beliefs and working styles.',
              'Report inappropriate conduct through the designated reporting channels.',
              'Cooperate honestly with any investigation.',
            ],
          },
        ],
      },
      {
        id: 'responsibilities-harassment',
        number: '2.2',
        title: 'Harassment and Bullying',
        blocks: [
          {
            kind: 'p',
            text: 'Complaints may be raised with HR, a line manager or another designated senior manager. Where the complaint concerns the usual reporting manager, the employee may approach an alternative manager or director.',
          },
          {
            kind: 'p',
            text: 'Complaints will be handled promptly, impartially and confidentially as far as reasonably practicable. Retaliation against anyone raising a concern in good faith or participating in an investigation is prohibited.',
          },
        ],
      },
    ],
  },
  {
    id: 'records',
    number: '3',
    title: 'Employment Administration and Employee Records',
    icon: 'solar:user-id-bold',
    summary: 'The documents HR needs from you and how your records are kept.',
    blocks: [],
    subsections: [
      {
        id: 'records-documentation',
        number: '3.1',
        title: 'Employment Documentation',
        blocks: [
          {
            kind: 'p',
            text: 'Employees must provide accurate information reasonably required for employment administration, including contact details, bank details, right-to-work evidence, qualifications and other relevant documents.',
          },
          {
            kind: 'p',
            text: 'Employees must notify HR promptly of changes to their address, telephone number, emergency contact, bank details or other information affecting their employment.',
          },
        ],
      },
      {
        id: 'records-personnel',
        number: '3.2',
        title: 'Personnel Records',
        blocks: [
          { kind: 'p', text: 'HR will maintain appropriate employee records, which may include:' },
          {
            kind: 'list',
            items: [
              'Employment contracts and role descriptions.',
              'Attendance, leave and sickness records.',
              'Training and professional development records.',
              'Performance reviews and disciplinary records.',
              'Payroll and statutory employment documentation.',
              'Relevant right-to-work and compliance records.',
            ],
          },
          {
            kind: 'p',
            text: 'Records will be accessed only by authorised personnel for legitimate business, legal or employment purposes and retained in accordance with applicable data protection and retention requirements.',
          },
        ],
      },
    ],
  },
  {
    id: 'working-hours',
    number: '4',
    title: 'Working Hours, Attendance and Timekeeping',
    icon: 'solar:clock-circle-bold',
    summary: 'Office hours, lunch and prayer breaks.',
    blocks: [],
    subsections: [
      {
        id: 'working-hours-normal',
        number: '4.1',
        title: 'Normal Working Hours',
        blocks: [
          {
            kind: 'p',
            text: 'Normal working hours will be stated in the employment contract or communicated by management.',
          },
          {
            kind: 'highlight',
            title: '1:30 PM – 9:30 PM',
            text: '1 hour lunch break (10 minutes break for Zohar prayer, 10 minutes Asar prayer & 10 minutes for Maghrib — other prayers should be offered outside office hours).',
          },
          { kind: 'p', text: 'Employees are expected to:' },
          {
            kind: 'list',
            items: [
              'Be ready to work at their scheduled start time.',
              'Record working time accurately where required.',
              'Attend meetings and training punctually.',
              'Follow agreed break arrangements.',
              'Obtain approval for changes to their working schedule.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'attendance',
    number: '5',
    title: 'Attendance Records',
    icon: 'solar:check-circle-bold',
    summary: 'Marking attendance, running late and leaving early.',
    blocks: [
      { kind: 'p', text: "Employees must use the company's designated attendance system." },
      {
        kind: 'p',
        text: 'Records must accurately reflect attendance, absence, working time and client assignments. Falsifying attendance records or recording time not worked may result in disciplinary action.',
      },
    ],
    subsections: [
      {
        id: 'attendance-late',
        number: '5.1',
        title: 'Late-Coming Policy',
        blocks: [
          {
            kind: 'p',
            text: 'Employees who expect to arrive late must notify their reporting manager and HR within 15 minutes of scheduled start time.',
          },
          {
            kind: 'p',
            text: 'Where Management/Supervisor has not been informed by messages/calls, and if an employee is late thrice in a month by more than 15 minutes, they will be subject to disciplinary action according to the company policy. Repeated lateness, failure to notify management or deliberate misuse of attendance procedures may lead to formal action.',
          },
          {
            kind: 'highlight',
            title: 'Short leave',
            text: 'Arriving 1:30 hours after the scheduled time is considered a short leave.',
          },
        ],
      },
      {
        id: 'attendance-early',
        number: '5.2',
        title: 'Early Departure and Time Away from Work',
        blocks: [
          {
            kind: 'p',
            text: 'Employees must obtain approval before leaving the workplace during working hours for personal reasons.',
          },
          {
            kind: 'p',
            text: 'Employees should inform their manager if they need to attend an appointment, deal with an emergency or leave early because of illness or any other purpose.',
          },
        ],
      },
    ],
  },
  {
    id: 'leave',
    number: '6',
    title: 'Annual Leave and Paid/Public Holiday Policy',
    icon: 'solar:calendar-date-bold',
    summary: 'Holidays, annual leave, how to apply and sick leave.',
    blocks: [],
    subsections: [
      {
        id: 'leave-entitlement',
        number: '6.1',
        title: 'Holiday Entitlement',
        blocks: [
          {
            kind: 'p',
            text: "Each employee's contractual holiday entitlement will be specified in their employment contract or written employment particulars.",
          },
          { kind: 'p', text: 'Employees will be granted a total of 5 public holidays as follows:' },
          {
            kind: 'list',
            items: [
              '2 days for Eid-ul-Adha.',
              '2 days for Eid-ul-Fitr.',
              '1 day for Ashura (Muharram).',
            ],
          },
          {
            kind: 'p',
            text: 'These holidays will be observed in accordance with the official holiday schedule announced by the company.',
          },
          {
            kind: 'p',
            text: 'All other public holidays shall be given as announced by the Government of UK.',
          },
          {
            kind: 'p',
            text: 'Unforeseen circumstances: individuals will only be allowed to take a day off when the public at large is impacted due to any unforeseen event. Individuals should make every effort to come to the office though.',
          },
        ],
      },
      {
        id: 'leave-year',
        number: '6.2',
        title: 'Annual Leave Year',
        blocks: [
          {
            kind: 'highlight',
            title: '20 days paid leave · 1 January – 31 December',
            text: 'The statutory minimum paid leave entitlement is 20 days. If you join in the middle of a year, your annual leave entitlement is reduced pro rata.',
          },
          {
            kind: 'p',
            text: 'An employee is not eligible for annual leave in the following cases:',
          },
          {
            kind: 'list',
            items: [
              'Sickness, accident or authorized leave exceeding 30 days.',
              'Unauthorized leave for 3 days.',
              'Leaving employment before making an application for leave or where notice is not served.',
            ],
          },
        ],
      },
      {
        id: 'leave-application',
        number: '6.3',
        title: 'Leave Application and Approval',
        blocks: [
          {
            kind: 'p',
            text: 'Employees must submit annual leave requests through the approved HR system or in writing to their reporting manager and HR.',
          },
          {
            kind: 'p',
            text: "The following notice periods are the company's normal planning expectations:",
          },
          {
            kind: 'list',
            items: [
              "One day of leave: normally at least three working days' notice.",
              "Two to five consecutive working days: normally at least one week's notice.",
              "More than five consecutive working days: normally at least two weeks' notice.",
            ],
          },
          {
            kind: 'p',
            text: 'Annual leave is not approved until confirmation is received from the authorised manager or HR. Approval will consider workload, client deadlines, team coverage, other approved absences and fairness between employees.',
          },
        ],
      },
      {
        id: 'leave-carryover',
        number: '6.4',
        title: 'Carryover and Unused Leave',
        blocks: [
          {
            kind: 'p',
            text: 'Unused statutory leave should normally be taken within the applicable leave year.',
          },
          {
            kind: 'highlight',
            title: 'Carry forward up to 5 days',
            text: 'Employees who do not use all their annual leave during the calendar year may carry forward a maximum of 5 unused annual leave days to the following year. Any unused annual leave exceeding this limit will not be carried forward.',
          },
        ],
      },
      {
        id: 'leave-sickness',
        number: '6.5',
        title: 'Sickness and Medical Absence Policy',
        blocks: [
          {
            kind: 'p',
            text: "Medical reports and doctor's notes are required where an employee is off sick for more than a day. According to the situation and the individual's performance, the absence will be adjusted against the paid leave balance.",
          },
        ],
      },
    ],
  },
  {
    id: 'conduct',
    number: '7',
    title: 'Code of Conduct and Professional Behaviour',
    icon: 'solar:verified-check-bold',
    summary: 'Professional behaviour and how to dress.',
    blocks: [
      {
        kind: 'p',
        text: 'Employees represent the company when dealing with clients, regulators, colleagues and external organisations.',
      },
      { kind: 'p', text: 'Employees must:' },
      {
        kind: 'list',
        items: [
          'Act honestly, professionally and courteously.',
          'Follow lawful and reasonable management instructions.',
          'Maintain accurate records and communicate truthfully.',
          'Avoid conflicts between personal interests and company duties.',
          "Protect the firm's reputation.",
          'Comply with applicable professional and ethical standards.',
          'Avoid conduct that could compromise client trust or professional independence.',
        ],
      },
      {
        kind: 'p',
        text: 'Threatening behaviour, harassment, fraud, dishonesty, deliberate record manipulation, serious insubordination and misuse of client information may result in formal disciplinary action.',
      },
    ],
    subsections: [
      {
        id: 'conduct-dress',
        number: '7.1',
        title: 'Dress and Appearance',
        blocks: [
          {
            kind: 'p',
            text: 'Employees should maintain a clean, professional appearance appropriate to their role, workplace and client-facing responsibilities.',
          },
          {
            kind: 'p',
            text: 'Any dress requirements will be applied fairly, with reasonable consideration for religious observance, disability and other relevant circumstances.',
          },
        ],
      },
    ],
  },
  {
    id: 'confidentiality',
    number: '8',
    title: 'Confidentiality and Client Information',
    icon: 'solar:shield-keyhole-bold-duotone',
    summary: 'Keeping client and company information safe.',
    blocks: [
      {
        kind: 'p',
        text: "Confidentiality is fundamental to the company's accountancy and advisory work.",
      },
      {
        kind: 'p',
        text: 'Employees must protect all confidential information relating to clients, employees, the company and third parties, including:',
      },
      {
        kind: 'list',
        items: [
          'Tax returns and tax planning information.',
          'Financial statements, bookkeeping records and audit evidence.',
          'Payroll, bank and personal identification details.',
          'Client passwords, access credentials and authentication information.',
          'Commercial agreements, pricing and internal financial information.',
          'Personal data and sensitive employee information.',
        ],
      },
      {
        kind: 'highlight',
        title: 'No freelance work',
        text: 'No employee is allowed to take on work relating to accounts, finance & tax in a personal capacity / freelance.',
      },
      {
        kind: 'p',
        text: 'Employees must access information only where authorised and necessary for their role. Confidential information must not be disclosed to unauthorised persons, copied to personal accounts, stored on unapproved devices or discussed in public places.',
      },
    ],
  },
  {
    id: 'ai',
    number: '9',
    title: 'Use of Artificial Intelligence and Automation',
    icon: 'solar:atom-bold-duotone',
    summary: 'Using AI tools safely, and mobile phones at work.',
    blocks: [
      {
        kind: 'p',
        text: 'Employees may use AI or automated tools only for approved business purposes and in accordance with company instructions.',
      },
      {
        kind: 'p',
        text: 'Employees must not enter identifiable client information, tax records, personal data, passwords or confidential documents into unapproved AI systems.',
      },
      {
        kind: 'p',
        text: 'AI-generated outputs must be reviewed by a competent person before use in client work. Employees remain responsible for the accuracy, appropriateness and professional quality of work submitted under their name.',
      },
      {
        kind: 'p',
        text: 'AI must not be used to fabricate evidence, misrepresent work performed, generate misleading client communications or bypass professional review and approval procedures.',
      },
      {
        kind: 'highlight',
        title: 'Mobile phones',
        text: 'Mobile phones should always be on silent; private calls should be kept to a minimum (in case of emergency).',
      },
    ],
  },
  {
    id: 'expenses',
    number: '10',
    title: 'Expenses, Travel and Company Property',
    icon: 'solar:wad-of-money-bold',
    summary: 'Claiming expenses and looking after company property.',
    blocks: [
      {
        kind: 'p',
        text: 'Business expenses must be necessary, reasonable, properly documented and incurred for authorised business purposes.',
      },
      {
        kind: 'p',
        text: "Employees must submit expense claims with receipts and required details within the company's stated deadlines. Personal expenses must not be claimed as business expenses.",
      },
      {
        kind: 'p',
        text: 'If any individual wants to take official accessories (laptop, phone etc.) home with them, they need to fill in an official form of permission from management and superiors. Employees are allowed to take laptops home; those must only be used for work.',
      },
      {
        kind: 'p',
        text: 'All premises must be used responsibly and protected against loss, theft or damage. Loss, theft or suspected misuse must be reported promptly.',
      },
      {
        kind: 'p',
        text: 'Employees must return company property, client materials, access credentials and other business records when requested and upon termination of employment.',
      },
    ],
  },
  {
    id: 'leaving',
    number: '13',
    title: 'Leaving the Company and Final Settlement',
    icon: 'solar:suitcase-tag-bold',
    summary: 'Notice period, handover and final settlement.',
    blocks: [
      {
        kind: 'p',
        text: 'Employees must give notice in accordance with their employment contract and applicable law.',
      },
      {
        kind: 'p',
        text: 'During the notice period, employees must continue to perform their duties, complete handovers and cooperate with reasonable transition arrangements.',
      },
      {
        kind: 'p',
        text: 'Before departure, employees must return company property, transfer outstanding client work, document the status of assignments and remove company information from personal devices or accounts as directed.',
      },
      {
        kind: 'p',
        text: 'HR will process final salary, any lawful adjustments, accrued holiday pay or deductions in accordance with the contract and applicable legislation.',
      },
      {
        kind: 'p',
        text: 'Confidentiality, data protection and other continuing obligations remain applicable after employment ends.',
      },
      {
        kind: 'p',
        text: 'The company will provide required employment documentation and respond to lawful reference requests in accordance with its reference policy.',
      },
    ],
  },
  {
    id: 'annual-dinner',
    number: '12',
    title: 'Annual Dinner',
    icon: 'solar:confetti-minimalistic-outline',
    summary: 'Our yearly get-together.',
    blocks: [
      {
        kind: 'p',
        text: "The company may organize an annual dinner for employees to promote teamwork, strengthen workplace relationships, and appreciate employees' contributions. The date, venue, and arrangements will be decided by management. Participation and other related arrangements will be communicated to employees in advance.",
      },
    ],
  },
  {
    id: 'innovation',
    number: '11',
    title: 'Innovation & Continuous Improvement Policy',
    icon: 'solar:cup-star-bold',
    summary: 'Share ideas that improve how we work and get rewarded.',
    blocks: [
      {
        kind: 'highlight',
        title: 'Work smarter, get rewarded',
        text: 'At BNW Consultants (SMC-Private) Limited, we encourage every employee to think creatively, challenge inefficient processes and contribute ideas that create measurable value for the organisation.',
      },
      {
        kind: 'p',
        text: 'Employees are encouraged to propose innovative solutions, improve the quality and presentation of working papers, streamline accounting and administrative processes, enhance client service, identify new business opportunities and introduce practical improvements that increase productivity, accuracy, efficiency or profitability.',
      },
      {
        kind: 'p',
        text: "Employees whose ideas are successfully implemented and deliver meaningful results may receive management recognition, performance awards, financial incentives or other appropriate rewards, subject to approval and the company's reward arrangements.",
      },
    ],
  },
];

// ----------------------------------------------------------------------

export type PolicyGroup = {
  id: string;
  title: string;
  description: string;
  icon: IconifyName;
  sectionIds: string[];
};

/** The handbook split into a few themes, so a new joiner isn't faced with one long list. */
export const POLICY_GROUPS: PolicyGroup[] = [
  {
    id: 'start',
    title: 'Getting started',
    description: 'Read these first.',
    icon: 'solar:home-angle-bold-duotone',
    sectionIds: ['introduction', 'responsibilities', 'records'],
  },
  {
    id: 'time',
    title: 'Time & leave',
    description: 'Hours, attendance and time off.',
    icon: 'solar:calendar-date-bold',
    sectionIds: ['working-hours', 'attendance', 'leave'],
  },
  {
    id: 'work',
    title: 'How we work',
    description: 'Conduct, client data, AI and expenses.',
    icon: 'solar:case-minimalistic-bold',
    sectionIds: ['conduct', 'confidentiality', 'ai', 'expenses'],
  },
  {
    id: 'life',
    title: 'Life at BNW',
    description: 'Ideas, events and moving on.',
    icon: 'solar:heart-bold',
    sectionIds: ['innovation', 'annual-dinner', 'leaving'],
  },
];

const sectionById = new Map(POLICY_SECTIONS.map((s) => [s.id, s]));

/** Every section in reading order (group by group). */
export const POLICY_READING_ORDER: PolicySection[] = POLICY_GROUPS.flatMap((g) =>
  g.sectionIds.map((id) => sectionById.get(id)!)
);

export function groupOf(sectionId: string): PolicyGroup | undefined {
  return POLICY_GROUPS.find((g) => g.sectionIds.includes(sectionId));
}

export type PolicyQuickFact = {
  icon: IconifyName;
  label: string;
  value: string;
  detail: string;
  sectionId: string;
};

/** The rules people ask about most, so a new joiner gets them without reading everything. */
export const POLICY_QUICK_FACTS: PolicyQuickFact[] = [
  {
    icon: 'solar:clock-circle-bold',
    label: 'Working hours',
    value: '1:30 PM – 9:30 PM',
    detail: '1 hour lunch plus short prayer breaks',
    sectionId: 'working-hours',
  },
  {
    icon: 'solar:danger-triangle-bold',
    label: 'Running late?',
    value: 'Tell your manager & HR',
    detail: 'Within 15 minutes of your start time. 1:30 hrs late counts as a short leave.',
    sectionId: 'attendance',
  },
  {
    icon: 'solar:calendar-date-bold',
    label: 'Annual leave',
    value: '20 days a year',
    detail: 'January – December, pro rata if you join mid-year',
    sectionId: 'leave',
  },
  {
    icon: 'solar:flag-bold',
    label: 'Public holidays',
    value: '5 days',
    detail: 'Eid-ul-Fitr (2), Eid-ul-Adha (2) and Ashura (1)',
    sectionId: 'leave',
  },
  {
    icon: 'solar:letter-bold',
    label: 'Leave notice',
    value: '3 days · 1 week · 2 weeks',
    detail: 'For 1 day · 2–5 days · more than 5 days off',
    sectionId: 'leave',
  },
  {
    icon: 'solar:restart-bold',
    label: 'Carry forward',
    value: 'Up to 5 days',
    detail: 'Unused leave above 5 days is not carried over',
    sectionId: 'leave',
  },
  {
    icon: 'solar:medical-kit-bold',
    label: 'Off sick',
    value: "Doctor's note after 1 day",
    detail: 'Sick days may be adjusted against your paid leave',
    sectionId: 'leave',
  },
  {
    icon: 'solar:shield-keyhole-bold-duotone',
    label: 'Client information',
    value: 'Keep it confidential',
    detail: 'No personal or freelance accounts, finance or tax work',
    sectionId: 'confidentiality',
  },
  {
    icon: 'solar:atom-bold-duotone',
    label: 'AI tools',
    value: 'No client data',
    detail: 'Only approved tools, and check every AI output. Phones stay on silent.',
    sectionId: 'ai',
  },
];

/** Rough reading time in minutes. */
export function readingMinutes(section: PolicySection): number {
  return Math.max(1, Math.round(sectionText(section).split(/\s+/).length / 200));
}

/** All the text of a section (for search). */
export function sectionText(section: PolicySection): string {
  const blockText = (blocks: PolicyBlock[]) =>
    blocks
      .map((b) =>
        b.kind === 'list' ? b.items.join(' ') : b.kind === 'highlight' ? `${b.title} ${b.text}` : b.text
      )
      .join(' ');
  return [
    section.title,
    blockText(section.blocks),
    ...(section.subsections ?? []).map((sub) => `${sub.title} ${blockText(sub.blocks)}`),
  ].join(' ');
}
