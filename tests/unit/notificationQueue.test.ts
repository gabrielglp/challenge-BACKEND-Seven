import { notificationQueue, scheduleAppointmentReminders } from '../../src/queues';
import '../mocks/bullmq-mock';
import { jest } from '@jest/globals';

describe('Notification Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve agendar lembretes para um agendamento', async () => {
    const now = new Date('2025-05-20T12:00:00Z').getTime();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    
    const addSpy = jest.spyOn(notificationQueue, 'add');
    
    const appointment = {
      id: 'test-id',
      date: new Date('2025-05-21T14:00:00Z'),
      time: '14:00',
      client_id: 'client-id',
      specialist_id: 'specialist-id',
      scheduled_by_id: 'scheduler-id',
      status: 'pending'
    };
    
    await scheduleAppointmentReminders(appointment);
    
    expect(addSpy).toHaveBeenCalled();
    
    jest.restoreAllMocks();
  });
});