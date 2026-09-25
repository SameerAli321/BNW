import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Role } from '../entities/role.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { DocumentType } from '../entities/document-type.entity';
import { EmployeeDocument } from '../entities/employee-document.entity';
import { DocumentRequest } from '../entities/document-request.entity';
import { LetterTemplate } from '../entities/letter-template.entity';
import { Letter } from '../entities/letter.entity';
import { LetterEvent } from '../entities/letter-event.entity';
import { Signature } from '../entities/signature.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Notification } from '../entities/notification.entity';
import { AppraisalRequest } from '../entities/appraisal-request.entity';
import { AppraisalEvent } from '../entities/appraisal-event.entity';
import { Candidate } from '../entities/candidate.entity';
import { JoiningPackItem } from '../entities/joining-pack-item.entity';
import { JoiningPackAck } from '../entities/joining-pack-ack.entity';

loadEnv();

/**
 * DataSource used by the TypeORM CLI (migration:generate/run/revert) and by the seed script.
 * The running Nest app itself configures TypeORM via TypeOrmModule.forRootAsync in app.module.ts;
 * this file is kept in sync with those options so migrations always run against the same schema.
 */
export const typeOrmDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'bnw',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'BNW',
  namingStrategy: new SnakeNamingStrategy(),
  entities: [
    Role,
    Department,
    User,
    RefreshToken,
    DocumentType,
    EmployeeDocument,
    DocumentRequest,
    LetterTemplate,
    Letter,
    LetterEvent,
    Signature,
    EmployeeProfile,
    AuditLog,
    Notification,
    AppraisalRequest,
    AppraisalEvent,
    Candidate,
    JoiningPackItem,
    JoiningPackAck,
  ],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: false,
  logging: false,
};

const dataSource = new DataSource(typeOrmDataSourceOptions);
export default dataSource;
