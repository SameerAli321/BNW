import { randomUUID } from 'crypto';
import { copyFile } from 'fs/promises';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { extname, join } from 'path';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { DocumentType } from '../entities/document-type.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
import { DocumentRequest } from '../entities/document-request.entity';
import { DocumentSource } from '../common/enums/document-source.enum';
import { DocumentRequestStatus } from '../common/enums/document-request-status.enum';
import { toUserDto, UserDto } from '../common/mappers/user.mapper';
import {
  DocumentRequestDto,
  DocumentTypeDto,
  EmployeeDocumentDto,
  toDocumentRequestDto,
  toDocumentTypeDto,
  toEmployeeDocumentDto,
} from '../common/mappers/document.mapper';
import { UsersService } from '../users/users.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { UPLOADS_ROOT_DIR } from './employee-documents.storage';

export interface EmployeeRecord {
  user: UserDto;
  documents: EmployeeDocumentDto[];
  documentRequests: DocumentRequestDto[];
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(DocumentType) private readonly documentTypesRepo: Repository<DocumentType>,
    @InjectRepository(EmployeeDocument)
    private readonly employeeDocumentsRepo: Repository<EmployeeDocument>,
    @InjectRepository(DocumentRequest)
    private readonly documentRequestsRepo: Repository<DocumentRequest>,
    private readonly usersService: UsersService,
  ) {}

  private async findEmployeeOrThrow(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Employee not found');
    }
    return user;
  }

  private async findDocumentTypeOrThrow(id: number): Promise<DocumentType> {
    const documentType = await this.documentTypesRepo.findOne({ where: { id } });
    if (!documentType) {
      throw new BadRequestException('Unknown document type');
    }
    return documentType;
  }

  async getRecord(employeeId: number): Promise<EmployeeRecord> {
    const employee = await this.usersService.findOneEntity(employeeId);

    const documents = await this.employeeDocumentsRepo.find({
      where: { userId: employeeId },
      relations: ['documentType', 'uploadedByUser'],
      order: { createdAt: 'DESC' },
    });

    const documentRequests = await this.documentRequestsRepo.find({
      where: { userId: employeeId },
      relations: ['documentType'],
      order: { createdAt: 'DESC' },
    });

    return {
      user: toUserDto(employee),
      documents: documents.map(toEmployeeDocumentDto),
      documentRequests: documentRequests.map(toDocumentRequestDto),
    };
  }

  async listDocumentTypes(): Promise<DocumentTypeDto[]> {
    const types = await this.documentTypesRepo.find({ order: { name: 'ASC' } });
    return types.map(toDocumentTypeDto);
  }

  async uploadDocument(
    employeeId: number,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    uploadedBy: number,
  ): Promise<EmployeeDocumentDto> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    await this.findEmployeeOrThrow(employeeId);
    await this.findDocumentTypeOrThrow(dto.documentTypeId);

    const doc = this.employeeDocumentsRepo.create({
      userId: employeeId,
      documentTypeId: dto.documentTypeId,
      // Stored relative to the uploads root so the DB isn't tied to an absolute machine path.
      filePath: join('employee-documents', file.filename),
      originalName: file.originalname,
      mime: file.mimetype,
      size: file.size,
      source: DocumentSource.UPLOAD,
      uploadedBy,
    });
    const saved = await this.employeeDocumentsRepo.save(doc);

    const full = await this.employeeDocumentsRepo.findOne({
      where: { id: saved.id },
      relations: ['documentType', 'uploadedByUser'],
    });
    return toEmployeeDocumentDto(full!);
  }

  /**
   * Attaches a file that already exists on disk elsewhere (not a fresh multer upload) to an
   * employee's E-record — e.g. copying a converted candidate's CV in on hire, per the original
   * guide's "CVs are retained in employee E-record" (H1). Copies the bytes into
   * `employee-documents/` under a fresh filename (leaving the source file where it was) and
   * creates the DB row exactly like `uploadDocument` does.
   */
  async attachExistingFile(params: {
    employeeId: number;
    documentTypeName: string;
    sourceAbsolutePath: string;
    originalName: string;
    mime: string;
    size: number;
    source: DocumentSource;
    uploadedBy: number;
  }): Promise<EmployeeDocumentDto> {
    await this.findEmployeeOrThrow(params.employeeId);
    const documentType = await this.documentTypesRepo.findOne({
      where: { name: params.documentTypeName },
    });
    if (!documentType) {
      throw new BadRequestException(`Unknown document type: ${params.documentTypeName}`);
    }

    const destRelativePath = join(
      'employee-documents',
      `${randomUUID()}${extname(params.originalName)}`,
    );
    await copyFile(params.sourceAbsolutePath, join(UPLOADS_ROOT_DIR, destRelativePath));

    const doc = this.employeeDocumentsRepo.create({
      userId: params.employeeId,
      documentTypeId: documentType.id,
      filePath: destRelativePath,
      originalName: params.originalName,
      mime: params.mime,
      size: params.size,
      source: params.source,
      uploadedBy: params.uploadedBy,
    });
    const saved = await this.employeeDocumentsRepo.save(doc);

    const full = await this.employeeDocumentsRepo.findOne({
      where: { id: saved.id },
      relations: ['documentType', 'uploadedByUser'],
    });
    return toEmployeeDocumentDto(full!);
  }

  async createDocumentRequest(
    employeeId: number,
    dto: CreateDocumentRequestDto,
    requestedBy: number,
  ): Promise<DocumentRequestDto> {
    await this.findEmployeeOrThrow(employeeId);
    await this.findDocumentTypeOrThrow(dto.documentTypeId);

    const request = this.documentRequestsRepo.create({
      userId: employeeId,
      documentTypeId: dto.documentTypeId,
      requestedBy,
      status: DocumentRequestStatus.REQUESTED,
      dueDate: dto.dueDate ?? null,
    });
    const saved = await this.documentRequestsRepo.save(request);

    const full = await this.documentRequestsRepo.findOne({
      where: { id: saved.id },
      relations: ['documentType'],
    });
    return toDocumentRequestDto(full!);
  }

  /**
   * Files an already-generated document (not a multer upload) into an employee's E-record —
   * reused by the Sprint 3 letters module's employee-sign flow to auto-retain the signed PDF
   * (`source: 'LETTER'`) without duplicating file-storage/DB-insert logic. `filePath` must
   * already be relative to the shared uploads root (see employee-documents.storage.ts /
   * letter-pdf.storage.ts), same convention as the multer-driven uploadDocument() above.
   */
  async fileGeneratedDocument(params: {
    employeeId: number;
    documentTypeId: number;
    filePath: string;
    originalName: string;
    mime: string;
    size: number;
    source: DocumentSource;
    uploadedBy: number;
  }): Promise<EmployeeDocumentDto> {
    await this.findEmployeeOrThrow(params.employeeId);
    await this.findDocumentTypeOrThrow(params.documentTypeId);

    const doc = this.employeeDocumentsRepo.create({
      userId: params.employeeId,
      documentTypeId: params.documentTypeId,
      filePath: params.filePath,
      originalName: params.originalName,
      mime: params.mime,
      size: params.size,
      source: params.source,
      uploadedBy: params.uploadedBy,
    });
    const saved = await this.employeeDocumentsRepo.save(doc);

    const full = await this.employeeDocumentsRepo.findOne({
      where: { id: saved.id },
      relations: ['documentType', 'uploadedByUser'],
    });
    return toEmployeeDocumentDto(full!);
  }

  /**
   * Loads a document for GET /documents/:id/download. Returns the entity (so the caller can check
   * ownership against `userId` via UsersService.assertCanViewRecord) plus the absolute path on
   * disk. 404 if the document row doesn't exist.
   */
  async getDocumentForDownload(
    documentId: number,
  ): Promise<{ document: EmployeeDocument; absolutePath: string }> {
    const document = await this.employeeDocumentsRepo.findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return { document, absolutePath: join(UPLOADS_ROOT_DIR, document.filePath) };
  }
}
