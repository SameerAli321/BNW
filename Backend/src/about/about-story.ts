/**
 * The "What is BNW" story — every section HR / Admin can edit on the About us page. Long texts are
 * plain strings; a blank line starts a new paragraph. Stored inside the `about_us` setting next to
 * the company details and the CEO's message, so no table is needed.
 *
 * DEFAULT_STORY is the client's own text (Nov 2026), word for word. It's used until someone saves
 * the story from the page.
 */

export type StoryItem = { title: string; text: string };
export type StoryMilestone = { date: string; title: string; text: string };

export type AboutStory = {
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
  /** Short line shown large between the firm profiles and the rest of the section. */
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
};

export const DEFAULT_STORY: AboutStory = {
  welcomeTitle: 'Welcome to BNW',
  welcomeSubtitle: 'Our Story, Our Values, Our People',

  whoWeAre: [
    'BNW is a UK-based firm of Chartered Accountants, established in 2012 with a vision to deliver reliable, high-quality accounting, taxation and business support services.',
    'What began as an accountancy practice has evolved into a professional services organisation, supporting individuals, entrepreneurs and businesses across the UK and beyond.',
    'A significant milestone in our journey came in October 2015, when we established our Pakistan office. This marked the beginning of our international operations and reflected our belief in developing talented professionals and creating opportunities beyond geographical boundaries.',
    'In 2018, Hayes Accountants Ltd was established by S. H. Israr and M. Zia as a sister firm to BNW. Both firms operate under shared leadership and maintain their own teams and client responsibilities, while sharing professional expertise, infrastructure and organisational resources to strengthen their combined capabilities.',
    'Today, our wider organisation brings together qualified professionals, experienced accountants and emerging talent across the United Kingdom and Pakistan.',
    'We believe our greatest strength is not simply the services we provide, but the people who deliver them.',
  ].join('\n\n'),

  vision: [
    'To build a respected, forward-thinking professional services organisation recognised for its technical excellence, integrity, people development and lasting client relationships.',
    'We aspire to create an organisation where talented individuals can build meaningful careers, clients can place their trust in our expertise, and professional excellence becomes part of our everyday culture.',
  ].join('\n\n'),

  mission: [
    'To help businesses and individuals achieve their financial and commercial objectives through dependable professional services, while creating opportunities for our people to learn, grow and succeed.',
    'We aim to combine technical knowledge, modern technology and a collaborative working environment to deliver meaningful value to our clients.',
  ].join('\n\n'),

  servicesIntro:
    'Our services extend beyond traditional accounting and taxation. We support businesses with their financial, operational and strategic requirements.',
  services: [
    {
      title: 'Accounting & Financial Reporting',
      text: 'Bookkeeping, management accounts, statutory financial statements, financial reconciliations and reporting under applicable accounting standards.',
    },
    {
      title: 'Taxation & Compliance',
      text: 'Corporation tax, personal taxation, self-assessment, VAT and other statutory compliance obligations.',
    },
    {
      title: 'Payroll & Business Administration',
      text: 'Payroll processing, PAYE, National Insurance, company formation and ongoing administrative support.',
    },
    {
      title: 'Outsourced Finance & Business Operations',
      text: 'Dedicated finance teams, accounts payable and receivable, financial controls, reporting and outsourced business support functions.',
    },
    {
      title: 'Business Advisory & Financial Management',
      text: 'Budgeting, forecasting, cash flow management, financial analysis, business planning and strategic financial support.',
    },
  ],
  servicesOutro:
    'Through these services, we aim to become a trusted and dependable part of our clients’ businesses.',

  groupIntro:
    'BNW and Hayes Accountants Ltd are sister firms operating under shared leadership, with a common commitment to professional excellence, integrity and client service.',
  firms: [
    {
      title: 'BNW Accountants',
      text: 'Established in the United Kingdom in 2012, BNW provides accounting, taxation, business advisory and outsourced financial services. Its Pakistan operations, established in October 2015, form an important part of its international service delivery capabilities.',
    },
    {
      title: 'Hayes Accountants Ltd',
      text: 'Established in 2018 by S. H. Israr and M. Zia, Hayes Accountants Ltd is a UK accountancy practice operating as a sister firm to BNW.',
    },
  ],
  groupMotto: 'Independence in responsibility, strength through collaboration.',
  groupText: [
    'Although both firms maintain independent teams, client portfolios and day-to-day responsibilities, they benefit from shared leadership and access to common organisational resources.',
    'This collaborative structure enables both firms to share knowledge, technical expertise, technology, infrastructure, training and operational support.',
    'Our approach is based on a simple principle: independence in responsibility, strength through collaboration.',
    'We encourage employees of both firms to recognise that, while they may work within different teams and serve different clients, they are part of a wider professional network working towards shared standards and long-term success.',
    'Each firm remains responsible for its own client engagements, confidentiality obligations and applicable professional and regulatory requirements.',
  ].join('\n\n'),

  philosophyIntro: [
    'At BNW, we believe professional success is built on a combination of competence, character and commitment.',
    'We do not measure success solely by revenue, the number of clients we serve or the size of our organisation. We also measure it by the trust we earn, the quality of our work, the development of our people and the reputation we build.',
    'Our philosophy rests on six fundamental principles.',
  ].join('\n\n'),
  principles: [
    {
      title: 'Integrity Above Everything',
      text: 'Trust is the foundation of our profession. We believe in honesty, transparency, confidentiality and doing what is right, even when nobody is watching.',
    },
    {
      title: 'Ownership & Accountability',
      text: 'We encourage everyone to take responsibility for their work. Ownership means understanding the task, meeting commitments, identifying problems and working towards solutions rather than simply passing responsibility to others.',
    },
    {
      title: 'Excellence in Everything We Do',
      text: [
        'Accuracy, attention to detail and timely delivery are not optional extras. They are essential professional responsibilities.',
        'We encourage our people to continuously improve the quality of their work and never become comfortable with avoidable mistakes.',
      ].join('\n\n'),
    },
    {
      title: 'Respect & Teamwork',
      text: [
        'We believe every individual deserves dignity and respect, irrespective of their position, experience or background.',
        'We succeed as a team, support one another and recognise that collective achievement is more valuable than individual recognition alone.',
      ].join('\n\n'),
    },
    {
      title: 'Learning & Professional Growth',
      text: [
        'Knowledge is one of our most valuable assets. We encourage professional qualifications, continuous learning, knowledge sharing and the development of leadership skills.',
        'We want BNW to be a place where individuals become better professionals than they were when they joined.',
      ].join('\n\n'),
    },
    {
      title: 'Long-Term Thinking',
      text: [
        'We believe in building lasting relationships rather than pursuing short-term gains.',
        'Our decisions should protect the interests of our clients, our colleagues and the organisation’s long-term reputation.',
      ].join('\n\n'),
    },
  ],

  culture: [
    'BNW is more than a workplace. It is a professional community where individuals from different backgrounds come together with shared objectives.',
    'We aim to maintain a culture that is professional yet approachable, disciplined yet supportive, and ambitious yet grounded in mutual respect.',
    'We encourage open communication, constructive feedback, initiative and a willingness to help others.',
    'We believe that seniority brings greater responsibility, not greater entitlement. Leadership at BNW should be demonstrated through conduct, competence, fairness and the ability to develop others.',
    'Similarly, we expect every team member, regardless of their role, to demonstrate professionalism, commitment and respect.',
    'These principles extend across our sister firms. While teams may operate independently, we encourage a culture of mutual support, shared learning and cooperation throughout the wider organisation.',
  ].join('\n\n'),

  expectationsIntro: [
    'Being part of BNW or Hayes carries both opportunities and responsibilities.',
    'We expect our colleagues to:',
  ].join('\n\n'),
  expectations: [
    {
      title: 'Act professionally',
      text: 'Maintain honesty, discipline, confidentiality and respectful conduct.',
    },
    {
      title: 'Take ownership',
      text: 'Be responsible for assigned work and follow tasks through to completion.',
    },
    {
      title: 'Deliver quality',
      text: 'Check work carefully, meet deadlines and maintain professional standards.',
    },
    {
      title: 'Communicate effectively',
      text: 'Raise concerns early, provide timely updates and seek clarification when needed.',
    },
    {
      title: 'Continue learning',
      text: 'Develop technical knowledge, improve skills and remain open to feedback.',
    },
    {
      title: 'Support colleagues',
      text: 'Share knowledge, collaborate and contribute positively to the working environment.',
    },
    {
      title: 'Think beyond the task',
      text: 'Understand how individual responsibilities contribute to client satisfaction and organisational success.',
    },
  ],
  expectationsOutro:
    'We recognise that mistakes can happen. What matters is the willingness to acknowledge them, correct them, learn from them and prevent their recurrence.',

  commitment: [
    'We recognise that our continued success depends on the people who work with us.',
    'We aim to provide an environment that supports professional development, recognises contributions, encourages responsibility and creates opportunities for career progression.',
    'Through our shared resources and collaborative structure, we seek to provide opportunities for knowledge sharing, professional training and career development across both firms.',
    'We want our people to feel proud of the work they perform, the skills they develop and the organisation they represent.',
    'We believe that when our people grow, our organisation grows with them.',
  ].join('\n\n'),

  journeyIntro:
    'Our story reflects a journey of steady development, international expansion and professional collaboration.',
  milestones: [
    {
      date: '2012',
      title: 'The Beginning',
      text: 'BNW was established in the United Kingdom, with a commitment to providing dependable accounting, taxation and business support services.',
    },
    {
      date: 'October 2015',
      title: 'Expansion into Pakistan',
      text: 'BNW established its Pakistan office, creating a foundation for international operations, cross-border collaboration and the development of a talented professional workforce.',
    },
    {
      date: '2018',
      title: 'Establishment of Hayes Accountants Ltd',
      text: 'S. H. Israr and M. Zia established Hayes Accountants Ltd as a sister firm. Operating under shared leadership, both firms developed their own teams and client relationships while benefiting from common resources, infrastructure and professional expertise.',
    },
    {
      date: 'Today',
      title: 'Growing Together',
      text: [
        'Today, BNW and Hayes collectively serve over 1,000 clients, ranging from individuals and small businesses to established companies with more complex financial and operational requirements.',
        'This milestone reflects the trust our clients place in us, the dedication of our people and the professional capabilities we have developed over the years.',
        'Both firms continue to operate as distinct professional practices while working collaboratively to strengthen their services, develop their teams and maintain consistently high standards of client service.',
      ].join('\n\n'),
    },
  ],
  journeyOutro: [
    'Our progress has been shaped by the trust of our clients, the dedication of our colleagues and our willingness to adapt to an evolving business environment.',
    'As we look ahead, our ambition is to continue building sustainable, technology-enabled and internationally connected professional services businesses without compromising the values on which they were founded.',
    'We want to grow, but never at the expense of integrity, quality or our people.',
  ].join('\n\n'),

  yourRole: [
    'Whether you are joining BNW or Hayes today, or have been part of our journey for years, you have a role in shaping our future.',
    'Every client interaction, every completed assignment, every deadline met and every colleague supported contributes to the reputation we build.',
    'Our reputation is not created by our names or our offices. It is created by our everyday actions.',
    'We do not simply want to build successful accountancy firms. We want to build an organisation that our clients trust, our people are proud to belong to, and future generations of professionals aspire to join.',
    'Welcome to our professional family. Be part of our journey. Be proud of your contribution.',
  ].join('\n\n'),
};
