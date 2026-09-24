import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { LettersService } from './letters.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateLetterTemplateDto } from './dto/create-letter-template.dto';
import { UpdateLetterTemplateDto } from './dto/update-letter-template.dto';
import { QueryLetterTemplatesDto } from './dto/query-letter-templates.dto';

@Controller('letter-templates')
export class LetterTemplatesController {
  constructor(private readonly lettersService: LettersService) {}

  @Roles(RoleName.HR, RoleName.CEO, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QueryLetterTemplatesDto) {
    const data = await this.lettersService.listTemplates(query);
    return { data };
  }

  @Roles(RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateLetterTemplateDto) {
    return this.lettersService.createTemplate(dto);
  }

  @Roles(RoleName.HR, RoleName.CEO, RoleName.ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lettersService.getTemplate(id);
  }

  @Roles(RoleName.ADMIN)
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLetterTemplateDto) {
    return this.lettersService.updateTemplate(id, dto);
  }

  @Roles(RoleName.HR, RoleName.CEO, RoleName.ADMIN)
  @Get(':id/fields')
  async fields(@Param('id', ParseIntPipe) id: number) {
    const fieldsSchema = await this.lettersService.getTemplateFields(id);
    return { data: fieldsSchema };
  }
}
