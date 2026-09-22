import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';

@Controller('departments')
export class DepartmentsController {
  constructor(
    @InjectRepository(Department) private readonly departmentsRepo: Repository<Department>,
  ) {}

  // Any authenticated user may read the department list.
  @Get()
  async findAll() {
    const departments = await this.departmentsRepo.find({ order: { name: 'ASC' } });
    return departments.map((d) => ({ id: d.id, name: d.name }));
  }
}
