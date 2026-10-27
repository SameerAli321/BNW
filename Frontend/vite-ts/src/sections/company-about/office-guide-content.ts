// ----------------------------------------------------------------------
// About us → Guide sheet: the office guide for new joiners, as supplied by the client (Oct 2026).
// Edit the wording here; the page lays it out.

export const OFFICE_GUIDE_TITLE = 'Welcome to BNW Consultants!';

export const OFFICE_GUIDE_INTRO =
  'We’re glad to have you on board. To help you settle in and navigate our workplace with ease, here’s a quick guide to our office facilities, daily procedures and communication channels.';

export const OFFICE_GUIDE_CLOSING =
  'We look forward to having you as part of BNW Consultants and wish you a productive and fulfilling journey with us!';

export type OfficeGuideSection = {
  id: string;
  title: string;
  icon: string;
  paragraphs: string[];
  /** Bulleted lines, each with an optional bold lead-in. */
  bullets?: { lead?: string; text: string }[];
};

export const OFFICE_GUIDE_SECTIONS: OfficeGuideSection[] = [
  {
    id: 'parking',
    title: 'Parking Facilities',
    icon: 'mingcute:location-fill',
    paragraphs: [
      'Parking within the office premises is reserved for the CEO. All other parking spaces are available on a first-come, first-served basis. If no space is available, employees are requested to park in the surrounding area.',
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance and Office Entry',
    icon: 'solar:clock-circle-bold',
    paragraphs: [
      'Upon arrival, all employees must complete their attendance through the biometric system, located in the ground-floor lounge near the Admin Office.',
      'Once attendance is marked, proceed to the first floor and settle at your allocated workstation.',
    ],
  },
  {
    id: 'oms',
    title: 'OMS Portal and Workstation',
    icon: 'solar:monitor-bold',
    paragraphs: [
      'After settling in, log in to your assigned user ID on the OMS Portal to access the relevant work-related systems and resources.',
      'Employees are required to check the OMS Portal daily for allocated tasks, relevant notifications and updates. The portal serves as a key communication channel within the office, so please ensure you stay updated on all important announcements and assigned responsibilities.',
      'Please ensure that you follow the procedures applicable to your role and department.',
    ],
  },
  {
    id: 'reporting',
    title: 'Reporting and Communication',
    icon: 'solar:users-group-rounded-bold',
    paragraphs: [
      'For work-related matters, employees should follow the designated reporting structure:',
    ],
    bullets: [
      {
        lead: 'Line Manager',
        text: 'For daily tasks, work assignments, progress updates and team-related matters.',
      },
      {
        lead: 'Practice Manager, Zeehsan',
        text: 'For further queries, operational concerns and matters requiring additional guidance.',
      },
      { lead: 'CEO', text: 'For matters requiring higher-level review or escalation.' },
    ],
  },
  {
    id: 'refreshments',
    title: 'Tea, Snacks and Refreshments',
    icon: 'solar:tea-cup-bold',
    paragraphs: [
      'Employees may use the kitchen on the ground floor for tea, snacks and other refreshments.',
      'If you wish to order food or refreshments from outside, please inform the office boy for assistance.',
      'Please keep shared spaces clean and tidy for everyone’s convenience.',
    ],
  },
  {
    id: 'pool',
    title: 'Pool Table and Recreation',
    icon: 'solar:gamepad-bold',
    paragraphs: [
      'The pool table is available for employees to use during appropriate breaks. To ensure fair access and avoid scheduling conflicts, please book your pool table slot through the OMS Portal before use.',
    ],
  },
  {
    id: 'meetings',
    title: 'Meetings and Calendar Bookings',
    icon: 'solar:calendar-date-bold',
    paragraphs: [
      'If you wish to meet with the CEO, a manager or any other colleague, please request a meeting and schedule it through the relevant calendar.',
      'Kindly ensure that meetings are booked in advance, subject to the other person’s availability.',
    ],
  },
  {
    id: 'etiquette',
    title: 'Workplace Etiquette',
    icon: 'solar:shield-check-bold',
    paragraphs: [
      'We encourage everyone to maintain a professional, respectful and collaborative work environment. Please keep your mobile phones on silent mode during working hours, be mindful of your colleagues, keep common areas organised, communicate courteously and follow the established office procedures.',
    ],
  },
];
