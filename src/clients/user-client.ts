import { Injectable, Logger } from "@nestjs/common";

/**
 * UserClient
 *
 * HTTP client for communicating with the User Service.
 * Provides methods to validate users.
 */
@Injectable()
export class UserClient {
  private readonly logger = new Logger(UserClient.name);
  private readonly userServiceUrl: string;

  constructor() {
    this.userServiceUrl =
      process.env.USER_SERVICE_URL || "http://localhost:8400";
    this.logger.log(`UserClient initialized with URL: ${this.userServiceUrl}`);
  }

  /**
   * Validate if a user exists by ID
   *
   * @param userId - User's unique identifier
   * @returns true if user exists, false otherwise
   */
  async validateUser(userId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.userServiceUrl}/users/${userId}/validate`,
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to validate user ${userId}: ${response.status}`,
        );
        return false;
      }

      const data = (await response.json()) as { exists?: boolean };
      const exists = data.exists ?? false;
      this.logger.log(`User ${userId} validation: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Error validating user ${userId}:`, error);
      return false;
    }
  }
}
