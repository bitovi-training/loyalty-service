import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Loyalty API - User Story 1: Balance Endpoint (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /loyalty/:userId/balance", () => {
    // T025: Success case - alice returns 200 balance
    it("should return balance for user with activity (alice)", () => {
      return request(app.getHttpServer())
        .get("/loyalty/alice/balance")
        .expect(200)
        .expect({
          userId: "alice",
          balance: 200,
          earnedPoints: 300,
          redeemedPoints: 100,
        });
    });

    it("should return zero balance for user with no orders (bob)", () => {
      return request(app.getHttpServer())
        .get("/loyalty/bob/balance")
        .expect(200)
        .expect({
          userId: "bob",
          balance: 0,
          earnedPoints: 0,
          redeemedPoints: 0,
        });
    });

    it("should return zero balance for fully redeemed user (charlie)", () => {
      return request(app.getHttpServer())
        .get("/loyalty/charlie/balance")
        .expect(200)
        .expect({
          userId: "charlie",
          balance: 0,
          earnedPoints: 500,
          redeemedPoints: 500,
        });
    });

    // T026: User not found case - 404 error
    it("should return 404 for non-existent user", () => {
      return request(app.getHttpServer())
        .get("/loyalty/nonexistent/balance")
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.message).toContain("User nonexistent not found");
          expect(res.body.error).toBe("Not Found");
        });
    });

    // T027: Performance test - <2s response time per plan.md
    it("should respond within 2 seconds", async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get("/loyalty/alice/balance")
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // <2s per plan.md
    });
  });

  describe("POST /loyalty/:userId/redeem", () => {
    // T043: Success case - valid redemption
    it("should successfully redeem points with valid request", () => {
      return request(app.getHttpServer())
        .post("/loyalty/alice/redeem")
        .send({ points: 50 })
        .expect(201)
        .expect((res) => {
          expect(res.body.userId).toBe("alice");
          expect(res.body.points).toBe(50);
          expect(res.body.redemptionId).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.newBalance).toBe(150); // 200 - 50
        });
    });

    // T044: Insufficient points case - 409 Conflict
    it("should return 409 when insufficient points", () => {
      return request(app.getHttpServer())
        .post("/loyalty/bob/redeem")
        .send({ points: 100 })
        .expect(409)
        .expect((res) => {
          expect(res.body.statusCode).toBe(409);
          expect(res.body.message).toContain("Insufficient points");
          expect(res.body.error).toBe("Conflict");
        });
    });

    // T045: Validation error - negative points
    it("should return 400 for negative points", () => {
      return request(app.getHttpServer())
        .post("/loyalty/alice/redeem")
        .send({ points: -50 })
        .expect(400)
        .expect((res) => {
          expect(res.body.statusCode).toBe(400);
          expect(res.body.error).toBe("Bad Request");
        });
    });

    it("should return 400 for zero points", () => {
      return request(app.getHttpServer())
        .post("/loyalty/alice/redeem")
        .send({ points: 0 })
        .expect(400);
    });

    // T046: User not found - 404
    it("should return 404 for non-existent user", () => {
      return request(app.getHttpServer())
        .post("/loyalty/nonexistent/redeem")
        .send({ points: 50 })
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.error).toBe("Not Found");
        });
    });

    // T047: Performance test - <3s response time
    it("should respond within 3 seconds", async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post("/loyalty/eve/redeem")
        .send({ points: 25 })
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // <3s per plan.md
    });
  });

  describe("GET /loyalty/:userId/redemptions", () => {
    // T064: Success case with multiple redemptions
    it("should return redemption history in reverse chronological order", () => {
      return request(app.getHttpServer())
        .get("/loyalty/eve/redemptions")
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe("eve");
          expect(res.body.redemptions.length).toBeGreaterThanOrEqual(2); // At least stub data
          // Verify sorted by timestamp descending (newest first)
          for (let i = 0; i < res.body.redemptions.length - 1; i++) {
            const current = new Date(
              res.body.redemptions[i].timestamp,
            ).getTime();
            const next = new Date(
              res.body.redemptions[i + 1].timestamp,
            ).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        });
    });

    // T065: Empty history case
    it("should return empty array for user with no redemptions", () => {
      return request(app.getHttpServer())
        .get("/loyalty/bob/redemptions")
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBe("bob");
          expect(res.body.redemptions).toEqual([]);
        });
    });

    // T066: User not found
    it("should return 404 for non-existent user", () => {
      return request(app.getHttpServer())
        .get("/loyalty/nonexistent/redemptions")
        .expect(404)
        .expect((res) => {
          expect(res.body.statusCode).toBe(404);
          expect(res.body.error).toBe("Not Found");
        });
    });
  });
});
