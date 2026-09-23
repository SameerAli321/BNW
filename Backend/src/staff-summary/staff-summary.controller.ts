import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { StaffSummaryService } from './staff-summary.service';
import { QueryStaffSummaryDto } from './dto/query-staff-summary.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { toCsv } from './csv.util';

const CSV_HEADERS = [
  'id',
  'employeeCode',
  'fullName',
  'email',
  'role',
  'departmentName',
  'designation',
  'managerName',
  'status',
  'joinDate',
  'documentCount',
];

@Roles(RoleName.HR, RoleName.CEO, RoleName.ADMIN)
@Controller('staff-summary')
export class StaffSummaryController {
  constructor(private readonly staffSummaryService: StaffSummaryService) {}

  @Get()
  async findAll(@Query() query: QueryStaffSummaryDto) {
    return this.staffSummaryService.findAll(query);
  }

  // No pagination on export — same filters as GET /staff-summary. Placed before no path
  // conflicts with GET / since it's a distinct static segment.
  @Get('export')
  async export(@Query() query: QueryStaffSummaryDto, @Res() res: Response) {
    const rows = await this.staffSummaryService.findAllForExport(query);
    const csv = toCsv(CSV_HEADERS, rows as unknown as Array<Record<string, unknown>>);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="staff-summary.csv"',
    });
    res.send(csv);
  }
}
