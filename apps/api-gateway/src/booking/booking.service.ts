import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import { IBookingRequest, IBookingResponse } from '@event-booking/shared';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly natsService: NatsService,
  ) {}

  async reserveSeat(eventId: number, userId: string) {
    const payload: IBookingRequest = {
      event_id: eventId,
      user_id: userId,
      timestamp: Date.now()
    };
    
    this.logger.log(`Sending booking request to NATS: ${JSON.stringify(payload)}`);
    
    try {
      // Use NATS built-in request/reply mechanism
      const response: IBookingResponse = await this.natsService.request('booking.reserve', payload, 30000);
      this.logger.log(`Received booking response from NATS: ${JSON.stringify(response)}`);
      
      if (!response.success) {
        // Handle business logic errors appropriately
        if (response.error.includes('already booked')) {
          throw new ConflictException(response.error);
        } else if (response.error.includes('not found')) {
          throw new NotFoundException(response.error);
        } else if (response.error.includes('available seats')) {
          throw new ConflictException(response.error);
        } else {
          throw new ConflictException(response.error);
        }
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error in booking request: ${error.message || error}`);
      throw error;
    }
  }
}