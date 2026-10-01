import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import {
  CancelInterviewDto,
  InterviewOutcomeDto,
  QueryInterviewsDto,
  ScheduleInterviewDto,
} from './dto/interview.dto';
import { InterviewsService } from './interviews.service';

// Same audience as the candidates list itself.
@Roles(RoleName.HR, RoleName.ADMIN)
@Controller()
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  @Get('interviews')
  async list(@Query() query: QueryInterviewsDto) {
    return this.service.list(query);
  }

  @Get('candidates/:candidateId/interviews')
  async forCandidate(@Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.service.list({ candidateId });
  }

  // Renders the invitation without saving or sending anything.
  @Post('candidates/:candidateId/interviews/preview')
  @HttpCode(HttpStatus.OK)
  async preview(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Body() dto: ScheduleInterviewDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.preview(candidateId, dto, caller);
  }

  @Post('candidates/:candidateId/interviews')
  async schedule(
    @Param('candidateId', ParseIntPipe) candidateId: number,
    @Body() dto: ScheduleInterviewDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.schedule(candidateId, dto, caller);
  }

  @Patch('interviews/:id')
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ScheduleInterviewDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.reschedule(id, dto, caller);
  }

  @Post('interviews/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelInterviewDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.cancel(id, dto, caller);
  }

  @Post('interviews/:id/resend')
  @HttpCode(HttpStatus.OK)
  async resend(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.resend(id, caller);
  }

  @Post('interviews/:id/outcome')
  @HttpCode(HttpStatus.OK)
  async outcome(@Param('id', ParseIntPipe) id: number, @Body() dto: InterviewOutcomeDto) {
    return this.service.setOutcome(id, dto);
  }
}
