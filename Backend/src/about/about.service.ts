import { join } from 'path';
import { unlink } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { AVATARS_DIR } from '../users/avatar.storage';
import { UpdateAboutDto } from './about.dto';
import { AboutStory, DEFAULT_STORY } from './about-story';

const SETTING_KEY = 'about_us';

type StoredAbout = {
  company: {
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
  };
  ceo: {
    name: string;
    title: string;
    /** Short headline shown large above the message; empty = the message's first sentence. */
    quote: string;
    message: string;
    photoFile: string | null;
  };
  /** The "What is BNW" story; missing parts fall back to DEFAULT_STORY. */
  story: AboutStory;
  updatedById: number | null;
  updatedAt: string | null;
};

/**
 * Starting content, from what the system already knows about the company (letterhead contacts,
 * the services in the employment contract). The CEO's message is deliberately empty — it's the
 * CEO's own words, added from the About us page.
 */
const DEFAULTS: StoredAbout = {
  company: {
    name: 'BNW Consultants (SMC-Private) Limited',
    tagline: 'BNW Chartered Accountants',
    about:
      'BNW Consultants (SMC-Private) Limited is the Islamabad practice of BNW Chartered ' +
      'Accountants, with offices in Pakistan and the United Kingdom. Our team prepares accounts ' +
      'and tax work for clients and supports them by email, telephone and online.',
    mission: '',
    vision: '',
    services: [
      'Statutory accounts',
      'Corporation tax returns',
      'Individual tax returns',
      'VAT returns',
      'Tax planning',
    ],
    address: '427, Street 5/2, Block D, National Police Foundation, O9 PWD, Islamabad',
    phones: ['+92 51 2723510', '+44 20 8648 0800'],
    email: 'info@bnwconsultants.com',
    website: 'www.bnwconsultants.com',
  },
  ceo: { name: '', title: 'Chief Executive Officer', quote: '', message: '', photoFile: null },
  story: DEFAULT_STORY,
  updatedById: null,
  updatedAt: null,
};

export type AboutDto = {
  company: StoredAbout['company'];
  ceo: {
    name: string;
    title: string;
    quote: string;
    message: string;
    /** Uploaded on the About page, else the CEO's profile picture; null if neither. */
    photoUrl: string | null;
    hasCustomPhoto: boolean;
  };
  story: AboutStory;
  updatedAt: string | null;
  updatedByName: string | null;
};

/**
 * The saved story from an edit: each sent field replaces the saved one; cards with neither a
 * title nor text are dropped. Fields left out keep their saved value.
 */
function toStory(dto: UpdateAboutDto['story'] & object, current: AboutStory): AboutStory {
  const cards = <T extends { title: string; text: string }>(
    list: T[] | undefined,
    fallback: T[],
  ) => (list ? list.filter((item) => item.title || item.text) : fallback);
  const pick = (key: keyof AboutStory) => {
    const value = dto[key as keyof typeof dto];
    return typeof value === 'string' ? value : (current[key] as string);
  };
  return {
    welcomeTitle: pick('welcomeTitle'),
    welcomeSubtitle: pick('welcomeSubtitle'),
    whoWeAre: pick('whoWeAre'),
    vision: pick('vision'),
    mission: pick('mission'),
    servicesIntro: pick('servicesIntro'),
    services: cards(dto.services, current.services),
    servicesOutro: pick('servicesOutro'),
    groupIntro: pick('groupIntro'),
    firms: cards(dto.firms, current.firms),
    groupMotto: pick('groupMotto'),
    groupText: pick('groupText'),
    philosophyIntro: pick('philosophyIntro'),
    principles: cards(dto.principles, current.principles),
    culture: pick('culture'),
    expectationsIntro: pick('expectationsIntro'),
    expectations: cards(dto.expectations, current.expectations),
    expectationsOutro: pick('expectationsOutro'),
    commitment: pick('commitment'),
    journeyIntro: pick('journeyIntro'),
    milestones: cards(dto.milestones, current.milestones),
    journeyOutro: pick('journeyOutro'),
    yourRole: pick('yourRole'),
  };
}

/** The "About us" page: company details first, then the CEO's message with their photo. */
@Injectable()
export class AboutService {
  constructor(
    @InjectRepository(AppSetting) private readonly settingsRepo: Repository<AppSetting>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  private async stored(): Promise<StoredAbout> {
    const row = await this.settingsRepo.findOne({ where: { key: SETTING_KEY } });
    const value = (row?.value ?? {}) as Partial<StoredAbout>;
    return {
      company: { ...DEFAULTS.company, ...(value.company ?? {}) },
      ceo: { ...DEFAULTS.ceo, ...(value.ceo ?? {}) },
      story: { ...DEFAULT_STORY, ...(value.story ?? {}) },
      updatedById: value.updatedById ?? null,
      updatedAt: value.updatedAt ?? null,
    };
  }

  private async save(value: StoredAbout): Promise<void> {
    await this.settingsRepo.save(this.settingsRepo.create({ key: SETTING_KEY, value }));
  }

  async get(): Promise<AboutDto> {
    const about = await this.stored();
    const ceoUser = await this.usersRepo.findOne({
      where: { role: RoleName.CEO, status: UserStatus.ACTIVE },
      order: { id: 'ASC' },
    });
    const editor = about.updatedById
      ? await this.usersRepo.findOne({ where: { id: about.updatedById } })
      : null;
    const photoFile = about.ceo.photoFile ?? ceoUser?.avatarPath ?? null;
    return {
      company: about.company,
      ceo: {
        name: about.ceo.name || (ceoUser ? `${ceoUser.firstName} ${ceoUser.lastName}` : ''),
        title: about.ceo.title || 'Chief Executive Officer',
        quote: about.ceo.quote ?? '',
        message: about.ceo.message,
        photoUrl: photoFile ? `/users/avatars/${photoFile}` : null,
        hasCustomPhoto: !!about.ceo.photoFile,
      },
      story: about.story,
      updatedAt: about.updatedAt,
      updatedByName: editor ? `${editor.firstName} ${editor.lastName}` : null,
    };
  }

  async update(dto: UpdateAboutDto, editorId: number): Promise<AboutDto> {
    const about = await this.stored();
    await this.save({
      company: {
        name: dto.company.name,
        tagline: dto.company.tagline ?? '',
        // Superseded by the story (who we are, vision, mission, what we do) — kept if not sent.
        about: dto.company.about ?? about.company.about,
        mission: dto.company.mission ?? about.company.mission,
        vision: dto.company.vision ?? about.company.vision,
        services: dto.company.services ?? about.company.services,
        address: dto.company.address ?? '',
        phones: dto.company.phones ?? [],
        email: dto.company.email ?? '',
        website: dto.company.website ?? '',
      },
      ceo: {
        name: dto.ceo.name ?? '',
        title: dto.ceo.title ?? '',
        quote: dto.ceo.quote ?? '',
        message: dto.ceo.message ?? '',
        photoFile: about.ceo.photoFile,
      },
      story: dto.story ? toStory(dto.story, about.story) : about.story,
      updatedById: editorId,
      updatedAt: new Date().toISOString(),
    });
    return this.get();
  }

  /** Stores the uploaded photo's file name and removes the previous one. */
  async setPhoto(fileName: string, editorId: number): Promise<AboutDto> {
    const about = await this.stored();
    const previous = about.ceo.photoFile;
    await this.save({
      ...about,
      ceo: { ...about.ceo, photoFile: fileName },
      updatedById: editorId,
      updatedAt: new Date().toISOString(),
    });
    if (previous) await this.removeFile(previous);
    return this.get();
  }

  /** Back to the CEO's profile picture. */
  async removePhoto(editorId: number): Promise<AboutDto> {
    const about = await this.stored();
    if (about.ceo.photoFile) {
      await this.save({
        ...about,
        ceo: { ...about.ceo, photoFile: null },
        updatedById: editorId,
        updatedAt: new Date().toISOString(),
      });
      await this.removeFile(about.ceo.photoFile);
    }
    return this.get();
  }

  private async removeFile(fileName: string): Promise<void> {
    // Never the CEO's own profile picture — that file belongs to their account.
    const inUse = await this.usersRepo.findOne({ where: { avatarPath: fileName } });
    if (inUse) return;
    await unlink(join(AVATARS_DIR, fileName)).catch(() => undefined);
  }
}
