import { Injectable, Logger } from '@nestjs/common';

/**
 * UserClient
 * 
 * HTTP client for communicating with the User Service.
 * Provides methods to validate users and retrieve user information.
 */
@Injectable()
export class UserClient {
  private readonly logger = new Logger(UserClient.name);
  private readonly userServiceUrl: string;

  constructor() {
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8400';
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
      const response = await fetch(`${this.userServiceUrl}/users/${userId}/validate`);
      
      if (!response.ok) {
        this.logger.warn(`Failed to validate user ${userId}: ${response.status}`);
        return false;
      }

      const data = await response.json();
      this.logger.log(`User ${userId} validation: ${data.exists}`);
      return data.exists;
    } catch (error) {
      this.logger.error(`Error validating user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user information by ID
   * 
   * @param userId - User's unique identifier
   * @returns User information if found, null otherwise
   */
  async getUserById(userId: string): Promise<{ id: string; email: string; roles: string[] } | null> {
    try {
      const response = await fetch(`${this.userServiceUrl}/users/${userId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          this.logger.log(`User ${userId} not found`);
          return null;
        }
        this.logger.warn(`Failed to get user ${userId}: ${response.status}`);
        return null;
      }

      const user = await response.json();
      this.logger.log(`Retrieved user ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }
}
