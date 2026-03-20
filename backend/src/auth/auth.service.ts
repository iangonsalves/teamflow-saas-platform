import {
  ConflictException,
  NotFoundException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name.trim(),
        email,
        passwordHash,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      user: {
        sub: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    uploadedAvatarUrl?: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const name = updateProfileDto.name?.trim();
    const shouldRemoveAvatar = updateProfileDto.removeAvatar === true;
    const nextAvatarUrl =
      uploadedAvatarUrl !== undefined
        ? uploadedAvatarUrl
        : shouldRemoveAvatar
          ? null
          : undefined;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: name && name.length > 0 ? name : undefined,
        avatarUrl: nextAvatarUrl,
      },
    });

    if (
      existingUser.avatarUrl &&
      existingUser.avatarUrl !== updatedUser.avatarUrl &&
      existingUser.avatarUrl.includes('/uploads/avatars/')
    ) {
      const filename = existingUser.avatarUrl.split('/uploads/avatars/')[1];

      if (filename) {
        const filePath = join(process.cwd(), 'uploads', 'avatars', filename);

        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      }
    }

    return this.buildAuthResponse(updatedUser);
  }

  private async buildAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
