import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';
import { QueryInternalNotesDto } from './dto/query-internal-notes.dto';
import { InternalNotesService } from './internal-notes.service';

@Controller('internal-notes')
export class InternalNotesController {
  constructor(private readonly notesService: InternalNotesService) {}

  // Anyone — the "Notes for HR" box on every create form posts here once the record exists.
  // Each note shows its author, so HR can see who wrote it.
  @Post()
  async create(@Body() dto: CreateInternalNoteDto, @CurrentUser() caller: JwtUserPayload) {
    return this.notesService.create(dto, caller.sub);
  }

  // HR / Admin only — the notes are internal.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async list(@Query() query: QueryInternalNotesDto) {
    return this.notesService.list(query);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.notesService.remove(id);
  }
}
