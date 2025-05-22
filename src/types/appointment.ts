export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  RESCHEDULED = 'rescheduled',
  EXPIRED = 'expired'
}

export interface Appointment {
  id: string;
  client_id: string;
  specialist_id: string;
  scheduled_by_id: string;
  date: Date;
  time: string;
  status: AppointmentStatus;
  rescheduled_from_id: string | null;
  created_at: Date;
  updated_at: Date;
  client?: any;
  specialist?: any;
  scheduledBy?: any;
}

export interface AppointmentCreate {
  client_id: string;
  specialist_id: string;
  date: string;
  time: string;
}

export interface AppointmentReschedule {
  date: string;
  time: string;
}

export interface AppointmentStatusUpdate {
  status: AppointmentStatus;
}