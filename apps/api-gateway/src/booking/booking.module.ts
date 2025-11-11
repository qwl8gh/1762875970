import { Module } from '@nestjs/common';
import { NatsModule } from '../nats/nats.module';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';

@Module({
  imports: [NatsModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}