import { randomUUID } from 'crypto';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { toUserDto, UserDto } from '../common/mappers/user.mapper';
import { AuditLogService } from '../audit-log/audit-log.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async issueTokens(user: User): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES') || '15m',
      },
    );

    const jti = randomUUID();
    const refreshExpires = this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d';
    const refreshToken = this.jwt.sign(
      { sub: user.id, jti },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpires,
      },
    );

    const decoded: any = this.jwt.decode(refreshToken);
    const refreshExpiresAt = new Date(decoded.exp * 1000);

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        jti,
        tokenHash,
        expiresAt: refreshExpiresAt,
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async findUserWithRelations(id: number): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { id },
      relations: ['manager', 'department'],
    });
  }

  async login(
    email: string,
    password: string,
    ipAddress: string | null = null,
  ): Promise<{ tokens: TokenPair; user: UserDto }> {
    const user = await this.usersRepo.findOne({
      where: { email },
      relations: ['manager', 'department'],
    });

    if (!user || user.status === UserStatus.INACTIVE) {
      this.auditLogService.log({
        actorId: null,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        entityId: user?.id ?? null,
        after: { email },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      this.auditLogService.log({
        actorId: null,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        entityId: user.id,
        after: { email },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user);
    this.auditLogService.log({
      actorId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ipAddress,
    });
    return { tokens, user: toUserDto(user) };
  }

  async refresh(rawToken: string | undefined): Promise<{ tokens: TokenPair; user: UserDto }> {
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    let payload: { sub: number; jti: string };
    try {
      payload = this.jwt.verify(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.refreshRepo.findOne({ where: { jti: payload.jti } });
    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const matches = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    stored.revokedAt = new Date();
    await this.refreshRepo.save(stored);

    const user = await this.findUserWithRelations(payload.sub);
    if (!user || user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account no longer active');
    }

    const tokens = await this.issueTokens(user);
    return { tokens, user: toUserDto(user) };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    try {
      const payload: { jti: string } = this.jwt.verify(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const stored = await this.refreshRepo.findOne({ where: { jti: payload.jti } });
      if (stored && !stored.revokedAt) {
        stored.revokedAt = new Date();
        await this.refreshRepo.save(stored);
      }
    } catch {
      // Token already invalid/expired — nothing to revoke, logout still "succeeds".
    }
  }

  async me(userId: number): Promise<UserDto> {
    const user = await this.findUserWithRelations(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserDto(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await this.usersRepo.save(user);
  }
}
