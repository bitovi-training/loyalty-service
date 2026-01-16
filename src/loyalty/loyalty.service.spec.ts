import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { OrderClient } from '../clients/order-client';
import { UserClient } from '../clients/user-client';
import { RedemptionRepository } from './repositories/redemption.repository';

describe('LoyaltyService - User Story 1: Balance Calculation', () => {
  let service: LoyaltyService;
  let orderClient: jest.Mocked<OrderClient>;
  let userClient: jest.Mocked<UserClient>;
  let redemptionRepository: RedemptionRepository;

  beforeEach(async () => {
    const mockOrderClient = {
      getOrdersByUserId: jest.fn(),
    };

    const mockUserClient = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: OrderClient, useValue: mockOrderClient },
        { provide: UserClient, useValue: mockUserClient },
        RedemptionRepository,
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    orderClient = module.get(OrderClient) as jest.Mocked<OrderClient>;
    userClient = module.get(UserClient) as jest.Mocked<UserClient>;
    redemptionRepository =
      module.get<RedemptionRepository>(RedemptionRepository);
    
    // By default, mock all users as valid
    userClient.validateUser.mockResolvedValue(true);
  });

  describe('calculateBalance', () => {
    // T021: alice scenario - 300 earned, 100 redeemed = 200 balance
    it('should calculate correct balance for user with orders and redemptions', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-a1', products: [], totalPrice: 100, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 100 },
        { id: 'ord-a2', products: [], totalPrice: 150, orderDate: '2026-01-02', status: 'DELIVERED', accruedLoyaltyPoints: 150 },
        { id: 'ord-a3', products: [], totalPrice: 50, orderDate: '2026-01-03', status: 'SHIPPED', accruedLoyaltyPoints: 50 },
      ]);

      const result = await service.calculateBalance('alice');

      expect(result.earnedPoints).toBe(300); // 100 + 150 + 50
      expect(result.redeemedPoints).toBe(100);
      expect(result.balance).toBe(200);
    });

    // T022: bob scenario - no orders = 0 balance
    it('should return zero balance for user with no orders', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([]);

      const result = await service.calculateBalance('bob');

      expect(result.earnedPoints).toBe(0);
      expect(result.redeemedPoints).toBe(0);
      expect(result.balance).toBe(0);
    });

    // T023: charlie scenario - 500 earned, 500 redeemed = 0 balance
    it('should return zero balance for user with fully redeemed points', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-c1', products: [], totalPrice: 500, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 500 },
      ]);

      const result = await service.calculateBalance('charlie');

      expect(result.earnedPoints).toBe(500);
      expect(result.redeemedPoints).toBe(500); // 250 + 250
      expect(result.balance).toBe(0);
    });

    // T024: dave scenario - only delivered/shipped orders count (pending/cancelled excluded)
    it('should exclude pending and cancelled orders from balance calculation', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-d1', products: [], totalPrice: 200, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 200 },
        { id: 'ord-d2', products: [], totalPrice: 100, orderDate: '2026-01-02', status: 'CANCELED', accruedLoyaltyPoints: 100 },
      ]);

      const result = await service.calculateBalance('dave');

      // Dave has 1 delivered order (200 pts) and 1 cancelled (100 pts)
      // Only delivered should count
      expect(result.earnedPoints).toBe(200);
      expect(result.redeemedPoints).toBe(0);
      expect(result.balance).toBe(200);
    });
  });

  describe('getBalance', () => {
    it('should return balance response DTO for valid user', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-a1', products: [], totalPrice: 100, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 100 },
        { id: 'ord-a2', products: [], totalPrice: 150, orderDate: '2026-01-02', status: 'DELIVERED', accruedLoyaltyPoints: 150 },
        { id: 'ord-a3', products: [], totalPrice: 50, orderDate: '2026-01-03', status: 'SHIPPED', accruedLoyaltyPoints: 50 },
      ]);

      const result = await service.getBalance('alice');

      expect(result).toEqual({
        userId: 'alice',
        balance: 200,
        earnedPoints: 300,
        redeemedPoints: 100,
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userClient.validateUser.mockResolvedValue(false);
      
      await expect(service.getBalance('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getBalance('nonexistent')).rejects.toThrow(
        'User nonexistent not found',
      );
    });
  });
});

describe('LoyaltyService - User Story 2: Redemption', () => {
  let service: LoyaltyService;
  let orderClient: jest.Mocked<OrderClient>;
  let userClient: jest.Mocked<UserClient>;
  let redemptionRepository: RedemptionRepository;

  beforeEach(async () => {
    const mockOrderClient = {
      getOrdersByUserId: jest.fn(),
    };

    const mockUserClient = {
      validateUser: jest.fn(),
    };

    // Create fresh instances for each test to avoid state pollution
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: OrderClient, useValue: mockOrderClient },
        { provide: UserClient, useValue: mockUserClient },
        RedemptionRepository,
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    orderClient = module.get(OrderClient) as jest.Mocked<OrderClient>;
    userClient = module.get(UserClient) as jest.Mocked<UserClient>;
    redemptionRepository =
      module.get<RedemptionRepository>(RedemptionRepository);
    
    // By default, mock all users as valid
    userClient.validateUser.mockResolvedValue(true);
  });

  describe('redeemPoints', () => {
    // T038: Valid redemption - alice has 200 available initially
    it('should successfully redeem points when sufficient balance exists', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-a1', products: [], totalPrice: 100, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 100 },
        { id: 'ord-a2', products: [], totalPrice: 150, orderDate: '2026-01-02', status: 'DELIVERED', accruedLoyaltyPoints: 150 },
        { id: 'ord-a3', products: [], totalPrice: 50, orderDate: '2026-01-03', status: 'SHIPPED', accruedLoyaltyPoints: 50 },
      ]);

      // Get current balance first
      const initialBalance = await service.calculateBalance('alice');
      const redeemAmount = 50; // Redeem a smaller amount

      const result = await service.redeemPoints('alice', redeemAmount);

      expect(result.userId).toBe('alice');
      expect(result.points).toBe(redeemAmount);
      expect(result.newBalance).toBe(initialBalance.balance - redeemAmount);
      expect(result.redemptionId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    // T039: Insufficient points - bob has 0, try to redeem 100
    it('should throw ConflictException when insufficient points', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([]);

      await expect(service.redeemPoints('bob', 100)).rejects.toThrow(
        ConflictException,
      );
    });

    // T040: Exact balance redemption - use dave (200 available, no prior redemptions)
    it('should allow redemption of exact available balance', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-d1', products: [], totalPrice: 200, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 200 },
      ]);

      const currentBalance = await service.calculateBalance('dave');
      const result = await service.redeemPoints('dave', currentBalance.balance);

      expect(result.userId).toBe('dave');
      expect(result.points).toBe(currentBalance.balance);
      expect(result.newBalance).toBe(0);
    });

    // T041: Negative/zero points validation
    it('should throw BadRequestException for zero points', async () => {
      await expect(service.redeemPoints('alice', 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for negative points', async () => {
      await expect(service.redeemPoints('alice', -50)).rejects.toThrow(
        BadRequestException,
      );
    });

    // T042: Concurrency safety - two redemptions serialized
    // Use dave who has no prior redemptions
    it('should handle concurrent redemptions for same user safely', async () => {
      orderClient.getOrdersByUserId.mockResolvedValue([
        { id: 'ord-d1', products: [], totalPrice: 100, orderDate: '2026-01-01', status: 'DELIVERED', accruedLoyaltyPoints: 100 },
        { id: 'ord-d2', products: [], totalPrice: 100, orderDate: '2026-01-02', status: 'DELIVERED', accruedLoyaltyPoints: 100 },
      ]);

      // Check dave's balance (200 available, no prior redemptions)
      const initialBalance = await service.calculateBalance('dave');
      expect(initialBalance.balance).toBe(200);

      // Dave has 200 available, redeem 50 twice concurrently
      const redemption1Promise = service.redeemPoints('dave', 50);
      const redemption2Promise = service.redeemPoints('dave', 50);

      // Both should complete without error (mutex ensures serialization)
      const results = await Promise.all([
        redemption1Promise,
        redemption2Promise,
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].points).toBe(50);
      expect(results[1].points).toBe(50);

      // Final balance should be 100 (200 - 50 - 50)
      const finalBalance = await service.calculateBalance('dave');
      expect(finalBalance.balance).toBe(100);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userClient.validateUser.mockResolvedValue(false);
      
      await expect(service.redeemPoints('nonexistent', 50)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('LoyaltyService - User Story 3: Redemption History', () => {
  let service: LoyaltyService;
  let orderClient: jest.Mocked<OrderClient>;
  let userClient: jest.Mocked<UserClient>;
  let redemptionRepository: RedemptionRepository;

  beforeEach(async () => {
    const mockOrderClient = {
      getOrdersByUserId: jest.fn(),
    };

    const mockUserClient = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: OrderClient, useValue: mockOrderClient },
        { provide: UserClient, useValue: mockUserClient },
        RedemptionRepository,
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    orderClient = module.get(OrderClient) as jest.Mocked<OrderClient>;
    userClient = module.get(UserClient) as jest.Mocked<UserClient>;
    redemptionRepository =
      module.get<RedemptionRepository>(RedemptionRepository);
    
    // By default, mock all users as valid
    userClient.validateUser.mockResolvedValue(true);
  });

  describe('getRedemptionHistory', () => {
    // T061: user with multiple redemptions (eve has 2)
    it('should return redemptions in reverse chronological order (newest first)', async () => {
      const result = await service.getRedemptionHistory('eve');

      expect(result.userId).toBe('eve');
      expect(result.redemptions).toHaveLength(2);

      // Verify newest first
      expect(result.redemptions[0].points).toBe(75); // red-e2, more recent
      expect(result.redemptions[1].points).toBe(25); // red-e1, older

      // Verify timestamps are descending
      const timestamp1 = new Date(result.redemptions[0].timestamp).getTime();
      const timestamp2 = new Date(result.redemptions[1].timestamp).getTime();
      expect(timestamp1).toBeGreaterThan(timestamp2);
    });

    // T062: user with no redemptions (bob)
    it('should return empty array for user with no redemptions', async () => {
      const result = await service.getRedemptionHistory('bob');

      expect(result.userId).toBe('bob');
      expect(result.redemptions).toEqual([]);
    });

    // T063: verify sorting
    it('should sort redemptions by timestamp descending', async () => {
      // Charlie has 2 redemptions per stub data
      const result = await service.getRedemptionHistory('charlie');

      expect(result.redemptions).toHaveLength(2);

      for (let i = 0; i < result.redemptions.length - 1; i++) {
        const current = new Date(result.redemptions[i].timestamp).getTime();
        const next = new Date(result.redemptions[i + 1].timestamp).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should throw NotFoundException for non-existent user', async () => {
      userClient.validateUser.mockResolvedValue(false);
      
      await expect(service.getRedemptionHistory('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
