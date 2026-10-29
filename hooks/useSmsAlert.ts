import { useCallback, useEffect, useState } from 'react';

import * as smsService from '../services/smsService';
import { Incident } from '../types/incident';

export interface UseSmsAlert {
  contact: string;
  isSending: boolean;
  message: string | null;
  send: (incident: Incident) => Promise<void>;
  updateContact: (contact: string) => Promise<void>;
  clearMessage: () => void;
}

/** Opens the native SMS composer. Delivery is never claimed by the app. */
export function useSmsAlert(): UseSmsAlert {
  const [contact, setContact] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await smsService.getEmergencyContact();
      if (!cancelled) setContact(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = useCallback(async (incident: Incident) => {
    setIsSending(true);
    setMessage('Sending alert...');
    const outcome = await smsService.openIncidentSms(incident);
    setMessage(outcome.message);
    setIsSending(false);
  }, []);

  const updateContact = useCallback(async (next: string) => {
    setContact(next);
    await smsService.setEmergencyContact(next);
  }, []);

  const clearMessage = useCallback(() => setMessage(null), []);

  return { contact, isSending, message, send, updateContact, clearMessage };
}
