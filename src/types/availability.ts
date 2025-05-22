export interface DayAvailability {
  [day: string]: string[];
}

export interface AvailabilityValidation {
  valid: boolean;
  message?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}