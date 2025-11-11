import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, Subscription, RequestOptions } from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private natsConnection: NatsConnection;
  private subscription: Subscription;
  private readonly logger = new Logger(NatsService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const natsUrl = this.configService.get('NATS_URL') || 'nats://nats:4222';
    this.logger.log(`Connecting to NATS at ${natsUrl}`);
    try {
      this.natsConnection = await connect({ servers: [natsUrl] });
      this.logger.log('Successfully connected to NATS');
    } catch (error) {
      this.logger.error(`Failed to connect to NATS: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.natsConnection) {
      await this.natsConnection.close();
    }
  }

  async publish(subject: string, data: any) {
    if (this.natsConnection) {
      try {
        await this.natsConnection.publish(subject, JSON.stringify(data));
        this.logger.log(`Published message to subject: ${subject}`);
      } catch (error) {
        this.logger.error(`Failed to publish message to subject ${subject}: ${error.message}`);
        throw error;
      }
    } else {
      throw new Error('NATS connection not available');
    }
  }

  async subscribe(subject: string, callback: (data: any) => void) {
    if (this.natsConnection) {
      const subscription = this.natsConnection.subscribe(subject);
      this.logger.log(`Subscribed to subject: ${subject}`);
      
      (async () => {
        for await (const msg of subscription) {
          try {
            callback(JSON.parse(msg.string()));
          } catch (error) {
            this.logger.error(`Error processing message for subject ${subject}:`, error);
          }
        }
      })();
    } else {
      throw new Error('NATS connection not available');
    }
  }

  async request(subject: string, data: any, options?: RequestOptions) {
    if (this.natsConnection) {
      try {
        const response = await this.natsConnection.request(
          subject,
          JSON.stringify(data),
          options
        );
        return JSON.parse(response.string());
      } catch (error) {
        this.logger.error(`Error making NATS request to subject ${subject}:`, error.message);
        throw error;
      }
    } else {
      throw new Error('NATS connection not available');
    }
  }

  async requestWithRetry(subject: string, data: any, maxRetries = 3, timeout = 20000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.request(subject, data, { timeout });
      } catch (error) {
        if (i === maxRetries - 1) {
          this.logger.error(`NATS request failed after ${maxRetries} retries:`, error.message);
          throw error;
        }
        this.logger.log(`NATS request attempt ${i + 1} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }
  }

  getConnection(): NatsConnection {
    return this.natsConnection;
  }
}