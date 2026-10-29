import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useWatchAI } from '../hooks/useWatchAI';
import { addNotificationTapListener } from '../services/notificationService';

/**
 * Opens the incident behind a tapped notification. Critical incidents re-open the
 * full-screen alert; everything else goes straight to the incident detail.
 */
export function NotificationTapHandler() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { getIncident, openCriticalAlert } = useWatchAI();

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const subscription = addNotificationTapListener((incidentId) => {
      if (!incidentId) return;
      const incident = getIncident(incidentId);
      if (!incident) return;

      if (incident.severity === 'CRITICAL') {
        openCriticalAlert(incident.id);
        return;
      }
      router.push({ pathname: '/incidents/[id]', params: { id: incident.id } });
    });

    return () => subscription.remove();
  }, [isAuthenticated, getIncident, openCriticalAlert, router]);

  return null;
}
