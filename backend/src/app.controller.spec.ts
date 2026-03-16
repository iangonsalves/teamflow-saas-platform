import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appService = {
    getHello: jest.fn().mockReturnValue('TeamFlow API is running.'),
    getHealth: jest.fn().mockResolvedValue({
      api: 'ok',
      database: 'ok',
      databaseName: 'teamflow_db',
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the TeamFlow health message', () => {
      expect(appController.getHello()).toBe('TeamFlow API is running.');
    });
  });

  describe('health', () => {
    it('should return the service health payload', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        api: 'ok',
        database: 'ok',
        databaseName: 'teamflow_db',
      });
    });
  });
});
