import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { ANALYSIS_STAGE_LABELS, ANALYSIS_STAGE_ORDER, AnalysisStage } from '../types/video';

interface AnalysisProgressProps {
  stage: AnalysisStage;
}

export function AnalysisProgress({ stage }: AnalysisProgressProps) {
  if (stage === 'IDLE') return null;

  const currentIndex = ANALYSIS_STAGE_ORDER.indexOf(stage);
  const isComplete = stage === 'COMPLETE';
  const isFailed = stage === 'FAILED';

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        {!isComplete && !isFailed ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        <Text
          style={[
            styles.header,
            isComplete ? { color: colors.success } : null,
            isFailed ? { color: colors.critical } : null,
          ]}
        >
          {ANALYSIS_STAGE_LABELS[stage]}
        </Text>
      </View>

      <View style={styles.steps}>
        {ANALYSIS_STAGE_ORDER.map((step, index) => {
          const done = isComplete || (currentIndex > -1 && index < currentIndex);
          const active = !isComplete && index === currentIndex;
          const color = done ? colors.success : active ? colors.accent : colors.textDim;
          return (
            <View key={step} style={styles.stepRow}>
              <View style={[styles.marker, { borderColor: color, backgroundColor: done ? color : 'transparent' }]} />
              <Text style={[styles.stepLabel, { color }]}>{ANALYSIS_STAGE_LABELS[step]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  header: {
    color: colors.accent,
    fontSize: font.body,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  steps: {
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  stepLabel: {
    fontSize: font.label,
    fontWeight: '600',
  },
});
