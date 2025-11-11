/**
 * Shared utilities and types for event booking system
 */
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export interface IBooking {
  id: number;
  event_id: number;
  user_id: string;
  created_at: Date;
}

export interface ICreateBookingDto {
  event_id: number;
  user_id: string;
}

export class CreateBookingDto {
  @IsNumber()
  @IsNotEmpty()
  event_id: number;

  @IsString()
  @IsNotEmpty()
  user_id: string;
}

export interface IBookingRequest {
  event_id: number;
  user_id: string;
  timestamp: number;
}

export interface IBookingResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: number;
}

export interface IEvent {
  id: number;
  name: string;
  total_seats: number;
}

export interface INatsMessage {
  subject: string;
  data: any;
  reply?: string;
}

export interface INatsRequest {
  subject: string;
  data: any;
  timeout?: number;
}

export interface INatsResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Event types for the event-driven architecture
export interface IBookingCreatedEvent {
  type: 'booking.created';
  data: {
    bookingId: number;
    eventId: number;
    userId: string;
    timestamp: string;
  };
}

export interface IBookingFailedEvent {
  type: 'booking.failed';
  data: {
    eventId: number;
    userId: string;
    error: string;
    timestamp: string;
  };
}