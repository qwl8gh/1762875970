import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@event-booking/database';
import { NatsModule } from '../nats/nats.module';
import { BookingService } from './booking.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NatsModule,
  ],
  providers: [BookingService],
})
export class BookingModule {}