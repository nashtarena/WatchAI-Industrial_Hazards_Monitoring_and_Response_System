import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../../../components/AppButton';
import { Banner } from '../../../components/Banner';
import { EmptyState } from '../../../components/EmptyState';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PERMISSIONS, can } from '../../../constants/permissions';
import { colors, font, letterSpacing, radius, spacing } from '../../../constants/theme';
import { useAuth } from '../../../hooks/useAuth';
import { useWatchAI } from '../../../hooks/useWatchAI';
import { GEMINI_MODEL, isGeminiConfigured } from '../../../lib/config';
import { formatDateTime } from '../../../lib/format';

export default function VideosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { analysisHistory, selectedVideo } = useWatchAI();

  const canUpload = can(role, PERMISSIONS.UPLOAD_VIDEO);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        eyebrow="Footage"
        title="CCTV Analysis"
        subtitle="Select a recorded clip from this device and run a Gemini safety analysis."
      />

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>AI ENGINE</Text>
        <Text style={styles.statusValue}>Google Gemini · {GEMINI_MODEL}</Text>
        <Text style={styles.statusMeta}>
          {isGeminiConfigured()
            ? 'API key detected. Analysis runs directly from this device and requires an internet connection.'
            : 'No API key found. Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo.'}
        </Text>
      </View>

      {!canUpload ? (
        <Banner
          tone="warning"
          title="Read-only role"
          message="Your role cannot select or analyse footage. You can still review incidents and alerts."
        />
      ) : (
        <View style={styles.actions}>
          <AppButton
            label={selectedVideo ? 'Continue With Selected Video' : 'Select CCTV Video'}
            onPress={() => router.push('/videos/upload')}
          />
          {selectedVideo ? (
            <Text style={styles.selectedNote} numberOfLines={1}>
              Ready: {selectedVideo.name} · {selectedVideo.sizeLabel}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ANALYSIS HISTORY</Text>
        {analysisHistory.length === 0 ? (
          <EmptyState
            title="No analyses in this session"
            message="Every completed analysis appears here with its validated result. History is in-memory only."
          />
        ) : (
          <View style={styles.list}>
            {analysisHistory.map((entry) => (
              <View key={entry.id} style={styles.historyCard}>
                <Text style={styles.historyName} numberOfLines={1}>
                  {entry.videoName}
                </Text>
                <Text style={styles.historyMeta}>{formatDateTime(entry.createdAt)}</Text>
                <View style={styles.historyRow}>
                  <Text
                    style={[
                      styles.historyStatus,
                      entry.analysisStatus === 'NO_INCIDENT' ? { color: colors.success } : null,
                      entry.analysisStatus === 'UNCERTAIN' ? { color: colors.medium } : null,
                    ]}
                  >
                    {entry.analysisStatus}
                  </Text>
                  <Text style={styles.historyCount}>
                    {entry.incidents.length} incident{entry.incidents.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.historySummary}>{entry.summary}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
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
    gap: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusLabel: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  statusValue: {
    color: colors.text,
    fontSize: font.heading,
    fontWeight: '700',
  },
  statusMeta: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
  },
  selectedNote: {
    color: colors.textMuted,
    fontSize: font.label,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  list: {
    gap: spacing.sm,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  historyName: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '700',
  },
  historyMeta: {
    color: colors.textDim,
    fontSize: font.micro,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  historyStatus: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  historyCount: {
    color: colors.textMuted,
    fontSize: font.micro,
    fontWeight: '700',
  },
  historySummary: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
  },
});
