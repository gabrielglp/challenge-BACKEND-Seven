export enum ActionType {
  CREATE = 'create',
  RESCHEDULE = 'reschedule',
  CANCEL = 'cancel',
  VALIDATION_ERROR = 'validation_error'
}

export interface AuditLog {
  id: string;
  user_id: string;
  action_type: ActionType;
  entity: string;
  entity_id: string;
  message: string;
  created_at: Date;
}

export interface AuditLogCreate {
  user_id: string;
  action_type: ActionType;
  entity: string;
  entity_id: string;
  message: string;
}