import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../components/AppButton';
import { Banner } from '../../components/Banner';
import { InfoRow } from '../../components/InfoRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { PERMISSION_LABELS, permissionsFor } from '../../constants/permissions';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../../constants/roles';
import { colors, font, letterSpacing, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { useNotifications } from '../../hooks/useNotifications';
import { useSmsAlert } from '../../hooks/useSmsAlert';
import { useWatchAI } from '../../hooks/useWatchAI';
import {
  ALERT_API_SOURCE,
  ALERT_API_URL,
  ALERT_API_WARNING,
  EMERGENCY_CONTACT_LABEL,
  isPlaceholderContact,
} from '../../lib/config';
import { checkAlertService } from '../../services/alertDispatchService';
import { AlertServiceHealth } from '../../types/notification';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, signOut } = useAuth();
  const biometrics = useBiometrics();
  const notifications = useNotifications();
  const sms = useSmsAlert();
  const {
    voiceAlarmEnabled,
    setVoiceAlarmEnabled,
    autoSmsEnabled,
    setAutoSmsEnabled,
    autoSmsConfigured,
    autoSmsMinSeverity,
  } = useWatchAI();

  const [contactDraft, setContactDraft] = useState<string | null>(null);
  const [contactSaved, setContactSaved] = useState(false);
  const [serviceCheck, setServiceCheck] = useState<AlertServiceHealth | null>(null);
  const [checkingService, setCheckingService] = useState(false);

  const contactValue = contactDraft ?? sms.contact;
  const permissions = permissionsFor(role);

  const handleBiometricToggle = async (next: boolean) => {
    if (next) {
      await biometrics.enable();
    } else {
      await biometrics.disable();
    }
  };

  const handleSaveContact = async () => {
    await sms.updateContact(contactValue);
    setContactSaved(true);
  };

  const handleCheckService = async () => {
    setCheckingService(true);
    setServiceCheck(await checkAlertService());
    setCheckingService(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader eyebrow="Session" title="Profile" subtitle="Local demo session — no backend account." />

      <View style={styles.card}>
        <InfoRow label="User" value={user?.name ?? '—'} />
        <InfoRow label="Email" value={user?.email ?? '—'} />
        <InfoRow label="Role" value={role ? ROLE_LABELS[role] : '—'} />
        <InfoRow label="Department" value={user?.department ?? '—'} />
        {role ? <Text style={styles.roleNote}>{ROLE_DESCRIPTIONS[role]}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>PERMISSIONS</Text>
        {permissions.map((permission) => (
          <Text key={permission} style={styles.permission}>
            • {PERMISSION_LABELS[permission]}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Biometric authentication</Text>
            <Text style={styles.switchMeta}>
              {biometrics.capabilities?.available
                ? `${biometrics.capabilities.methodLabel} · verified by the operating system`
                : (biometrics.capabilities?.unavailableReason ?? 'Checking device capability...')}
            </Text>
          </View>
          <Switch
            value={biometrics.enabled}
            onValueChange={(next) => void handleBiometricToggle(next)}
            disabled={!biometrics.capabilities?.available || biometrics.isChecking}
            trackColor={{ true: colors.accent, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </View>
        {biometrics.status ? <Text style={styles.statusNote}>{biometrics.status}</Text> : null}
        <Text style={styles.privacyNote}>
          WatchAI never stores fingerprints, Face ID data or any biometric template. Only an on/off
          preference is kept on this device.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <InfoRow
          label="Permission"
          value={notifications.permission}
          valueColor={notifications.permission === 'GRANTED' ? colors.success : colors.medium}
        />
        {notifications.permission !== 'GRANTED' ? (
          <AppButton
            label="Enable Notifications"
            variant="secondary"
            loading={notifications.isBusy}
            loadingLabel="Requesting..."
            onPress={() => void notifications.request()}
          />
        ) : null}
        <AppButton
          label="Test Critical Notification"
          variant="ghost"
          loading={notifications.isBusy}
          loadingLabel="Sending..."
          onPress={() => void notifications.sendTestCritical()}
        />
        {notifications.message ? <Text style={styles.statusNote}>{notifications.message}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Voice alarm on critical incidents</Text>
            <Text style={styles.switchMeta}>
              Speaks the validated incident summary using the device text-to-speech engine. Always stoppable.
            </Text>
          </View>
          <Switch
            value={voiceAlarmEnabled}
            onValueChange={(next) => void setVoiceAlarmEnabled(next)}
            trackColor={{ true: colors.accent, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Automatic SMS escalation</Text>
            <Text style={styles.switchMeta}>
              {autoSmsConfigured
                ? `${autoSmsMinSeverity} incidents are texted to the emergency contact immediately, with no human approval. The alert server sends it, so no SMS credentials are stored in this app.`
                : 'No alert server configured. Set EXPO_PUBLIC_ALERT_API_URL in .env to enable automatic sending.'}
            </Text>
          </View>
          <Switch
            value={autoSmsEnabled && autoSmsConfigured}
            onValueChange={(next) => void setAutoSmsEnabled(next)}
            disabled={!autoSmsConfigured}
            trackColor={{ true: colors.critical, false: colors.surfaceHigh }}
            thumbColor={colors.text}
          />
        </View>
        {autoSmsConfigured ? (
          <InfoRow
            label="Alert server"
            value={`${ALERT_API_URL}${ALERT_API_SOURCE === 'derived' ? '  (auto-detected)' : ''}`}
            stacked
          />
        ) : null}

        {ALERT_API_WARNING ? <Banner tone="warning" title="Address" message={ALERT_API_WARNING} /> : null}

        <AppButton
          label="Test Alert Server"
          variant="ghost"
          loading={checkingService}
          loadingLabel="Checking..."
          onPress={() => void handleCheckService()}
        />
        {serviceCheck ? (
          <Banner
            tone={serviceCheck.ready ? (serviceCheck.dryRun ? 'demo' : 'success') : 'warning'}
            title={serviceCheck.reachable ? 'Alert server' : 'Unreachable'}
            message={serviceCheck.message}
          />
        ) : null}
        {autoSmsConfigured && autoSmsEnabled ? (
          <Text style={styles.privacyNote}>
            Automatic messages are sent without confirmation. A false positive from the AI will still
            text your contact, so keep the contact set to a number you control while rehearsing.
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>EMERGENCY SMS CONTACT</Text>
        <Text style={styles.switchMeta}>
          {EMERGENCY_CONTACT_LABEL} — used to pre-address the native SMS composer.
        </Text>
        <TextInput
          value={contactValue}
          onChangeText={(next) => {
            setContactDraft(next);
            setContactSaved(false);
          }}
          keyboardType="phone-pad"
          placeholder="+910000000000"
          placeholderTextColor={colors.textDim}
          style={styles.input}
        />
        {isPlaceholderContact(contactValue) ? (
          <Banner
            tone="warning"
            title="Placeholder"
            message="This is a placeholder number. Set a real contact before demonstrating an actual escalation."
          />
        ) : null}
        <AppButton label="Save Contact" variant="secondary" onPress={() => void handleSaveContact()} />
        {contactSaved ? <Text style={styles.statusNote}>Emergency contact saved on this device.</Text> : null}
      </View>

      <AppButton label="Logout" variant="critical" onPress={() => void handleLogout()} />

      <Text style={styles.footnote}>
        WatchAI demo build · frontend only · no database, no backend. Gemini is the only AI layer and its key
        is bundled into this client, so it must be treated as a development credential.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  roleNote: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  permission: {
    color: colors.text,
    fontSize: font.label,
    lineHeight: 21,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '700',
  },
  switchMeta: {
    color: colors.textMuted,
    fontSize: font.micro,
    lineHeight: 16,
  },
  statusNote: {
    color: colors.textMuted,
    fontSize: font.label,
  },
  privacyNote: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  footnote: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
});
