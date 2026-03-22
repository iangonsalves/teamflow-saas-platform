import {
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AvatarUpload } from './types/avatar-upload.type';

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
    avatarFile?: AvatarUpload,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found.');
    }

    const name = updateProfileDto.name?.trim();
    const shouldRemoveAvatar = updateProfileDto.removeAvatar === true;
    const uploadedAvatarUrl = avatarFile
      ? await this.uploadAvatarToSupabase(userId, avatarFile)
      : undefined;
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

    if (existingUser.avatarUrl && existingUser.avatarUrl !== updatedUser.avatarUrl) {
      await this.deleteAvatarFromSupabase(existingUser.avatarUrl);
    }

    return this.buildAuthResponse(updatedUser);
  }

  private async uploadAvatarToSupabase(
    userId: string,
    avatarFile: AvatarUpload,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'avatars';

    if (!supabaseUrl || !supabaseKey) {
      throw new InternalServerErrorException(
        'Supabase storage is not configured.',
      );
    }

    const extension = extname(avatarFile.originalname) || '.png';
    const objectPath = `${userId}/avatar-${randomUUID()}${extension}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        'Content-Type': avatarFile.mimetype,
        'x-upsert': 'true',
      },
      body: new Uint8Array(avatarFile.buffer),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to upload avatar.');
    }

    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  private async deleteAvatarFromSupabase(avatarUrl: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'avatars';

    if (!supabaseUrl || !supabaseKey) {
      return;
    }

    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${bucket}/`;
    if (!avatarUrl.startsWith(publicPrefix)) {
      return;
    }

    const objectPath = avatarUrl.slice(publicPrefix.length);
    const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    }).catch(() => undefined);
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
