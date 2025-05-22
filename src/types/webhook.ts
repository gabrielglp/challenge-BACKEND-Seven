export enum WebhookEventType {
  APPOINTMENT_CREATED = 'appointment.created',
  APPOINTMENT_UPDATED = 'appointment.updated',
  APPOINTMENT_CANCELLED = 'appointment.cancelled',
  APPOINTMENT_COMPLETED = 'appointment.completed',
  APPOINTMENT_RESCHEDULED = 'appointment.rescheduled',
  CLIENT_CREATED = 'client.created',
  SPECIALIST_CREATED = 'specialist.created'
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface WebhookCreate {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  data: any;
}