import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisProgress } from '../../../components/AnalysisProgress';
import { AnomalyVideoPlayer } from '../../../components/AnomalyVideoPlayer';
import { AppButton } from '../../../components/AppButton';
import { Banner } from '../../../components/Banner';
import { IncidentCard } from '../../../components/IncidentCard';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { VideoPicker } from '../../../components/VideoPicker';
import { PERMISSIONS, can } from '../../../constants/permissions';
import { colors, font, letterSpacing, radius, spacing } from '../../../constants/theme';
import { useAuth } from '../../../hooks/useAuth';
import { useGeminiAnalysis } from '../../../hooks/useGeminiAnalysis';
import { useWatchAI } from '../../../hooks/useWatchAI';
import { isGeminiConfigured } from '../../../lib/config';
import { pickVideo } from '../../../services/videoService';

export default function UploadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { selectedVideo, setSelectedVideo } = useWatchAI();
  const analysis = useGeminiAnalysis();

  const [isSelecting, setIsSelecting] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const canUpload = can(role, PERMISSIONS.UPLOAD_VIDEO);
  const canAnalyze = can(role, PERMISSIONS.ANALYZE_VIDEO);

  const handleSelect = async () => {
    setIsSelecting(true);
    setPickError(null);
    analysis.reset();

    const result = await pickVideo();
    if (result.ok) {
      setSelectedVideo(result.video);
    } else if (result.code !== 'CANCELLED') {
      setPickError(result.message);
    }
    setIsSelecting(false);
  };

  const handleCancel = () => {
    setSelectedVideo(null);
    setPickError(null);
    analysis.reset();
    router.back();
  };

  const handleAnalyze = () => {
    if (!selectedVideo) return;
    void analysis.run(selectedVideo);
  };

  if (!canUpload) {
    return (
      <View style={[styles.flex, styles.guard, { paddingTop: insets.top + spacing.xl }]}>
        <Banner
          tone="warning"
          title="Not permitted"
          message="Your role cannot select or analyse CCTV footage."
        />
        <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const result = analysis.result;
  const failure = analysis.failure;

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
        eyebrow="Gemini analysis"
        title="Analyse Footage"
        subtitle="Selecting a clip never starts an analysis. Review the file, then tap Analyze Safety."
      />

      {!isGeminiConfigured() ? (
        <Banner
          tone="warning"
          title="Gemini not configured"
          message="Add EXPO_PUBLIC_GEMINI_API_KEY to .env and restart Expo before running an analysis."
        />
      ) : null}

      <VideoPicker
        video={selectedVideo}
        isSelecting={isSelecting}
        disabled={analysis.isAnalyzing}
        onSelect={() => void handleSelect()}
      />

      {selectedVideo ? (
        <View style={styles.playerBlock}>
          <Text style={styles.sectionTitle}>
            {result && result.incidents.length > 0 ? 'PLAYBACK · DETECTED REGIONS' : 'PLAYBACK'}
          </Text>
          <AnomalyVideoPlayer
            key={selectedVideo.uri}
            uri={selectedVideo.uri}
            incidents={result?.incidents ?? []}
          />
          {result && result.incidents.length > 0 ? (
            <Text style={styles.playerHint}>
              Tap a timestamp to jump to that moment. The box is drawn from the region Gemini
              reported, and appears while playback is within 1.5s of the incident.
            </Text>
          ) : null}
        </View>
      ) : null}

      {pickError ? <Banner tone="critical" title="Selection failed" message={pickError} /> : null}

      <View style={styles.actions}>
        {canAnalyze ? (
          <AppButton
            label="Analyze Safety"
            loading={analysis.isAnalyzing}
            loadingLabel="Analysing..."
            disabled={!selectedVideo || analysis.isAnalyzing}
            onPress={handleAnalyze}
            helperText={
              selectedVideo
                ? 'Sends the clip to Gemini for industrial safety analysis.'
                : 'Select a CCTV clip first.'
            }
          />
        ) : (
          <Banner
            tone="warning"
            message="Your role can select footage but cannot run the AI analysis."
          />
        )}
        <AppButton
          label="Cancel"
          variant="ghost"
          disabled={analysis.isAnalyzing}
          onPress={handleCancel}
        />
      </View>

      <AnalysisProgress stage={analysis.stage} />

      {failure ? (
        <View style={styles.resultBlock}>
          <Banner
            tone={failure.code === 'OFFLINE' ? 'warning' : 'critical'}
            title="Analysis failed"
            message={failure.message}
          />
          {failure.modelSummary ? <Text style={styles.modelNote}>Model note: {failure.modelSummary}</Text> : null}
          <Text style={styles.failureNote}>
            No incident was created and no alert was raised. You can adjust the clip and analyse again.
          </Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultBlock}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>ANALYSIS RESULT</Text>
            <Text
              style={[
                styles.summaryStatus,
                result.analysisStatus === 'NO_INCIDENT' ? { color: colors.success } : null,
                result.analysisStatus === 'UNCERTAIN' ? { color: colors.medium } : null,
              ]}
            >
              {result.analysisStatus}
            </Text>
            <Text style={styles.summaryText}>{result.summary}</Text>
            <Text style={styles.summaryMeta}>Source clip: {result.videoName}</Text>
          </View>

          {result.analysisStatus === 'UNCERTAIN' ? (
            <Banner
              tone="warning"
              title="Uncertain"
              message="Gemini reported that the footage does not clearly support a firm conclusion. Human verification is required."
            />
          ) : null}

          {result.droppedIncidents > 0 ? (
            <Banner
              tone="info"
              title="Validation"
              message={`${result.droppedIncidents} returned item${
                result.droppedIncidents === 1 ? ' was' : 's were'
              } rejected locally for missing or invalid fields.`}
            />
          ) : null}

          {result.incidents.length === 0 ? (
            <Banner
              tone="success"
              title="No incident"
              message="No clearly visible safety incident was detected in this clip."
            />
          ) : (
            <View style={styles.list}>
              <Text style={styles.sectionTitle}>DETECTED INCIDENTS</Text>
              {result.incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  guard: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  playerBlock: {
    gap: spacing.sm,
  },
  playerHint: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
  resultBlock: {
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryLabel: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  summaryStatus: {
    color: colors.accent,
    fontSize: font.title,
    fontWeight: '900',
    letterSpacing: letterSpacing.wide,
  },
  summaryText: {
    color: colors.text,
    fontSize: font.body,
    lineHeight: 22,
  },
  summaryMeta: {
    color: colors.textDim,
    fontSize: font.micro,
  },
  modelNote: {
    color: colors.textMuted,
    fontSize: font.label,
    fontStyle: 'italic',
  },
  failureNote: {
    color: colors.textDim,
    fontSize: font.label,
    lineHeight: 20,
  },
  list: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
});
