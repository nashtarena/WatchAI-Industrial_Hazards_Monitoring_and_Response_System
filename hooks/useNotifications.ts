import { useCallback, useEffect, useState } from 'react';

import * as notificationService from '../services/notificationService';
import { useWatchAI } from './useWatchAI';

export interface UseNotifications {
  permission: ReturnType<typeof useWatchAI>['notificationPermission'];
  isBusy: boolean;
  message: string | null;
  request: () => Promise<void>;
  sendTestCritical: () => Promise<void>;
  clearMessage: () => void;
}

export function useNotifications(): UseNotifications {
  const { notificationPermission, requestNotificationPermission, refreshNotificationPermission } =
    useWatchAI();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshNotificationPermission();
  }, [refreshNotificationPermission]);

  const request = useCallback(async () => {
    setIsBusy(true);
    setMessage(null);
    const result = await requestNotificationPermission();
    setMessage(
      result === 'GRANTED'
        ? 'Notification permission granted.'
        : 'Notification permission denied. Alerts will still appear inside the app.',
    );
    setIsBusy(false);
  }, [requestNotificationPermission]);

  const sendTestCritical = useCallback(async () => {
    setIsBusy(true);
    setMessage('Sending alert...');
    let permission = notificationPermission;
    if (permission !== 'GRANTED') {
      permission = await requestNotificationPermission();
    }
    if (permission !== 'GRANTED') {
      setMessage('Notification permission denied, so no test notification could be shown.');
      setIsBusy(false);
      return;
    }
    const delivered = await notificationService.sendTestCriticalNotification();
    setMessage(
      delivered
        ? 'Test critical notification sent to the device.'
        : 'The test notification could not be delivered on this device.',
    );
    setIsBusy(false);
  }, [notificationPermission, requestNotificationPermission]);

  const clearMessage = useCallback(() => setMessage(null), []);

  return {
    permission: notificationPermission,
    isBusy,
    message,
    request,
    sendTestCritical,
    clearMessage,
  };
}
