# Loyalty Service

This service manages customer loyalty points, including balance calculation,
point redemption, and order service integration.

## Features

- **Loyalty Points Management**: Track earned and redeemed points.
- **Balance Calculation**: Real-time point balance calculation from the order service.
- **Point Redemption**: Secure point redemption with concurrency control.
- **Order Service Client**: HTTP client to fetch order data from the Order Service.
- **Order Accrual Endpoint**: Record points earned on order submission.

## Order Service Integration

The loyalty service includes a simple `OrderClient` class for fetching order data
from the Order Service.

**See [ORDER_CLIENT.md](./ORDER_CLIENT.md) for usage documentation.**

## Environment Variables

- `PORT` - Server port (default: 3000)
- `ORDER_SERVICE_URL` - Order service URL (default: http://localhost:8100)
- `USER_SERVICE_URL` - User service URL (default: http://localhost:8400)

## API Endpoints

- `GET /loyalty/:userId/balance` - Get loyalty balance
- `POST /loyalty/:userId/redeem` - Redeem loyalty points
- `GET /loyalty/:userId/redemptions` - Get redemption history
- `POST /loyalty/orders` - Record loyalty points for an order

## Project setup

```bash
npm install
```

## Compile and run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Run tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
