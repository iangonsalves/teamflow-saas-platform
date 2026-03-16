import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  const prismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('registers a new user and returns an access token', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prismaService.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Ian',
      email: 'ian@example.com',
      passwordHash: 'hashed-password',
    });
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(
      authService.register({
        name: 'Ian',
        email: 'IAN@example.com',
        password: 'password123',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        name: 'Ian',
        email: 'ian@example.com',
      },
    });
  });

  it('rejects duplicate registration emails', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      authService.register({
        name: 'Ian',
        email: 'ian@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in an existing user with a valid password', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Ian',
      email: 'ian@example.com',
      passwordHash: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');

    await expect(
      authService.login({
        email: 'ian@example.com',
        password: 'password123',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'user-1',
        name: 'Ian',
        email: 'ian@example.com',
      },
    });
  });

  it('rejects invalid login credentials', async () => {
    prismaService.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Ian',
      email: 'ian@example.com',
      passwordHash: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'ian@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
