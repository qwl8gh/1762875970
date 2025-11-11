import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CreateBookingDto } from '@event-booking/shared';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.reserveSeat(
      createBookingDto.event_id,
      createBookingDto.user_id
    );
  }
}