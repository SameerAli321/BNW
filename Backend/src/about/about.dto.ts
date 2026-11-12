import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimList = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '')
    : value;

export class AboutCompanyDto {
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  about?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  mission?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  vision?: string;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  services?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  phones?: string[];

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: 'Enter a valid company email' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class AboutCeoDto {
  /** Leave empty to use the CEO's name from their account. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  title?: string;

  /** Short headline shown large on the CEO's Message page; empty = the message's first sentence. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  quote?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  message?: string;
}

/** A titled card in the story: a service, a firm, a principle, an expectation. */
export class StoryItemDto {
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  title: string;

  @Transform(trim)
  @IsString()
  @MaxLength(3000)
  text: string;
}

/** A dated step on the "Our Journey" timeline. */
export class StoryMilestoneDto extends StoryItemDto {
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  date: string;
}

const storyText = (max: number) => [Transform(trim), IsString(), MaxLength(max)];
const apply =
  (...decorators: PropertyDecorator[]): PropertyDecorator =>
  (target, key) =>
    decorators.forEach((decorator) => decorator(target, key));
/** A long story text: optional, trimmed, up to `max` characters. Blank lines split paragraphs. */
const StoryText = (max = 8000) => apply(IsOptional(), ...storyText(max));
/** A list of story cards (up to `max`). */
const StoryList = (type: () => typeof StoryItemDto, max = 20) =>
  apply(IsOptional(), IsArray(), ArrayMaxSize(max), ValidateNested({ each: true }), Type(type));

/** The "What is BNW" story — every section editable by HR / Admin (see about-story.ts). */
export class AboutStoryDto {
  @StoryText(150) welcomeTitle?: string;
  @StoryText(300) welcomeSubtitle?: string;
  @StoryText() whoWeAre?: string;
  @StoryText(4000) vision?: string;
  @StoryText(4000) mission?: string;
  @StoryText(2000) servicesIntro?: string;
  @StoryList(() => StoryItemDto) services?: StoryItemDto[];
  @StoryText(2000) servicesOutro?: string;
  @StoryText(2000) groupIntro?: string;
  @StoryList(() => StoryItemDto, 6) firms?: StoryItemDto[];
  @StoryText(300) groupMotto?: string;
  @StoryText() groupText?: string;
  @StoryText(4000) philosophyIntro?: string;
  @StoryList(() => StoryItemDto) principles?: StoryItemDto[];
  @StoryText() culture?: string;
  @StoryText(2000) expectationsIntro?: string;
  @StoryList(() => StoryItemDto) expectations?: StoryItemDto[];
  @StoryText(2000) expectationsOutro?: string;
  @StoryText() commitment?: string;
  @StoryText(2000) journeyIntro?: string;
  @StoryList(() => StoryMilestoneDto) milestones?: StoryMilestoneDto[];
  @StoryText(4000) journeyOutro?: string;
  @StoryText() yourRole?: string;
}

/**
 * PUT /about. Declared last: its property types are read when the class is defined (decorator
 * metadata), so every class it uses must already exist above it.
 */
export class UpdateAboutDto {
  @ValidateNested()
  @Type(() => AboutCompanyDto)
  company: AboutCompanyDto;

  @ValidateNested()
  @Type(() => AboutCeoDto)
  ceo: AboutCeoDto;

  /** The "What is BNW" story. Left out = keep what's saved. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AboutStoryDto)
  story?: AboutStoryDto;
}
