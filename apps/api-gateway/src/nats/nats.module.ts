import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';

@Module({
  imports: [ConfigModule],
  providers: [NatsService, ConfigService],
  exports: [NatsService],
})
export class NatsModule {}