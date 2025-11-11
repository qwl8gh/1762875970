import { Injectable, ConflictException, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '@event-booking/database';
import { NatsService } from '../nats/nats.service';
import { CreateBookingDto, IBookingRequest, IBookingResponse, IBookingCreatedEvent, IBookingFailedEvent } from '@event-booking/shared';

@Injectable()
export class BookingService implements OnModuleInit {
  private readonly logger = new Logger(BookingService.name);
  
  constructor(
    private prisma: PrismaService,
    private natsService: NatsService,
  ) {}

  async onModuleInit() {
    this.logger.log('BookingService initializing NATS subscription...');
    try {
      // Subscribe to booking reservation requests via NATS
      // Use lower-level NATS client to access message.reply functionality
      const subscription = this.natsService.getConnection().subscribe('booking.reserve');
      (async () => {
        for await (const msg of subscription) {
          try {
            const request: IBookingRequest = JSON.parse(msg.string());
            this.logger.log(`Received booking request: ${JSON.stringify(request)}`);
            
            // Process the request asynchronously without waiting for completion
            // This allows multiple requests to be processed concurrently
            this.processBookingRequest(msg, request).catch(err => {
              this.logger.error(`Error in async booking processing: ${err.message}`);
              this.logger.error(err.stack);
            });
          } catch (error) {
            this.logger.error(`Error parsing booking request: ${error.message}`);
            this.logger.error(error.stack);
            // Reply with error using the message's reply subject
            const response: IBookingResponse = {
              success: false,
              error: error.message,
              timestamp: Date.now()
            };
            msg.respond(JSON.stringify(response));
          }
        }
      })();
      
      this.logger.log('BookingService NATS subscription initialized.');
    } catch (error) {
      this.logger.error(`Error initializing NATS subscription: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  private async processBookingRequest(msg: any, request: IBookingRequest) {
    try {
      const result = await this.createBooking({
        event_id: request.event_id,
        user_id: request.user_id
      });
      
      this.logger.log(`Successfully processed booking request: ${JSON.stringify(result)}`);
      // Reply to the request using the message's reply subject
      const response: IBookingResponse = {
        success: true,
        data: result,
        timestamp: Date.now()
      };
      msg.respond(JSON.stringify(response));
    } catch (error) {
      this.logger.error(`Error processing booking request: ${error.message}`);
      this.logger.error(error.stack);
      // Reply with error using the message's reply subject
      const response: IBookingResponse = {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
      msg.respond(JSON.stringify(response));
    }
  }

  async createBooking(dto: CreateBookingDto) {
    this.logger.log(`Creating booking: ${JSON.stringify(dto)}`);
    
    // Cast to access Prisma client properties
    const prismaClient = this.prisma as any;
    
    // Check if event exists
    const event = await prismaClient.event.findUnique({
      where: { id: dto.event_id },
    });

    if (!event) {
      const errorMsg = `Event with ID ${dto.event_id} not found`;
      this.logger.error(errorMsg);
      throw new NotFoundException(errorMsg);
    }

    // Check if user already booked for this event
    const existingBooking = await prismaClient.booking.findUnique({
      where: {
        event_id_user_id: {
          event_id: dto.event_id,
          user_id: dto.user_id,
        },
      },
    });

    if (existingBooking) {
      const errorMsg = `User ${dto.user_id} already booked for event ${dto.event_id}`;
      this.logger.error(errorMsg);
      throw new ConflictException(errorMsg);
    }

    // Check if there are available seats
    const bookedSeatsCount = await prismaClient.booking.count({
      where: { event_id: dto.event_id },
    });

    if (bookedSeatsCount >= event.total_seats) {
      const errorMsg = `No available seats for event ${dto.event_id}`;
      this.logger.error(errorMsg);
      throw new ConflictException(errorMsg);
    }

    // Create the booking
    const booking = await prismaClient.booking.create({
      data: {
        event_id: dto.event_id,
        user_id: dto.user_id,
      },
    });

    // Publish booking created event using the new event type
    const bookingCreatedEvent: IBookingCreatedEvent = {
      type: 'booking.created',
      data: {
        bookingId: booking.id,
        eventId: dto.event_id,
        userId: dto.user_id,
        timestamp: new Date().toISOString(),
      }
    };
    await this.natsService.publish('booking.created', bookingCreatedEvent);

    this.logger.log(`Successfully created booking: ${booking.id}`);
    return booking;
 }
}
