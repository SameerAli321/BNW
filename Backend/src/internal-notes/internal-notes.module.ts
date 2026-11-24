import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalNote } from '../entities/internal-note.entity';
import { InternalNotesController } from './internal-notes.controller';
import { InternalNotesService } from './internal-notes.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternalNote])],
  controllers: [InternalNotesController],
  providers: [InternalNotesService],
  exports: [InternalNotesService],
})
export class InternalNotesModule {}
