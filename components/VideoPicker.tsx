import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { SelectedVideo } from '../types/video';
import { AppButton } from './AppButton';
import { InfoRow } from './InfoRow';

interface VideoPickerProps {
  video: SelectedVideo | null;
  isSelecting: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

/** Selection only. Analysis is always an explicit second action. */
export function VideoPicker({ video, isSelecting, disabled = false, onSelect }: VideoPickerProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.frame}>
        <Text style={styles.frameLabel}>CCTV SOURCE</Text>
        {video ? (
          <>
            <Text style={styles.fileName} numberOfLines={2}>
              {video.name}
            </Text>
            <InfoRow label="File name" value={video.name} />
            <InfoRow label="File type" value={video.mimeType} />
            <InfoRow label="File size" value={video.sizeLabel} />
          </>
        ) : (
          <Text style={styles.placeholder}>
            No video selected. Choose a recorded CCTV clip from this device to analyse.
          </Text>
        )}
      </View>

      <AppButton
        label={video ? 'Select A Different Video' : 'Select Video'}
        variant={video ? 'secondary' : 'primary'}
        loading={isSelecting}
        loadingLabel="Selecting video..."
        disabled={disabled}
        onPress={onSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  frame: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  frameLabel: {
    color: colors.accent,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wider,
  },
  fileName: {
    color: colors.text,
    fontSize: font.heading,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: font.label,
    lineHeight: 20,
    paddingVertical: spacing.sm,
  },
});
