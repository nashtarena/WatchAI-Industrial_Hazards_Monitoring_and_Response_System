import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { incidentTypeLabel } from '../constants/incidentTypes';
import { colors, font, letterSpacing, radius, severityColors, spacing } from '../constants/theme';
import { formatConfidence, secondsToTimestamp, timestampToSeconds } from '../lib/format';
import { BoundingBox, Incident } from '../types/incident';

/** How close playback must be to an incident timestamp for its box to show. */
const BOX_VISIBLE_WINDOW_S = 1.5;
const DEFAULT_ASPECT = 16 / 9;

interface AnomalyVideoPlayerProps {
  uri: string;
  /** Incidents detected in this clip. Only those with a region draw a box. */
  incidents: Incident[];
  /** Seek here on mount, e.g. when opened from an incident detail screen. */
  initialIncidentId?: string | null;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Plays the analysed clip and draws Gemini's bounding box over the anomalous region
 * while playback is near the incident timestamp.
 *
 * Boxes are drawn only where the model actually returned `box_2d`; nothing is
 * synthesised for incidents it could not localise.
 */
export function AnomalyVideoPlayer({ uri, incidents, initialIncidentId }: AnomalyVideoPlayerProps) {
  const player = useVideoPlayer({ uri }, (instance) => {
    instance.timeUpdateEventInterval = 0.2;
    instance.loop = false;
  });

  // No initial value: the payload carries live-stream fields we have no sensible default for.
  const timeUpdate = useEvent(player, 'timeUpdate');
  const currentTime = timeUpdate?.currentTime ?? player.currentTime;
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const [container, setContainer] = useState({ width: 0, height: 0 });
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [pinnedId, setPinnedId] = useState<string | null>(initialIncidentId ?? null);
  const seededRef = useRef(false);

  // The natural size only becomes known once the track loads.
  useEffect(() => {
    if (status !== 'readyToPlay') return;
    const size = player.videoTrack?.size;
    if (size && size.width > 0 && size.height > 0) {
      setAspect(size.width / size.height);
    }
  }, [status, player]);

  const localised = useMemo(
    () => incidents.filter((incident) => incident.region !== null),
    [incidents],
  );

  const seekTo = useCallback(
    (incident: Incident) => {
      const seconds = timestampToSeconds(incident.timestamp);
      setPinnedId(incident.id);
      if (seconds === null) return;
      player.pause();
      player.currentTime = seconds;
    },
    [player],
  );

  // Jump straight to the incident this player was opened for.
  useEffect(() => {
    if (seededRef.current || status !== 'readyToPlay' || !initialIncidentId) return;
    const target = incidents.find((incident) => incident.id === initialIncidentId);
    if (!target) return;
    seededRef.current = true;
    seekTo(target);
  }, [status, initialIncidentId, incidents, seekTo]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainer({ width, height });
  };

  /** The letterboxed rect the video actually occupies inside the container. */
  const videoRect = useMemo<Rect | null>(() => {
    if (container.width <= 0 || container.height <= 0) return null;
    const containerAspect = container.width / container.height;
    if (containerAspect > aspect) {
      const width = container.height * aspect;
      return { left: (container.width - width) / 2, top: 0, width, height: container.height };
    }
    const height = container.width / aspect;
    return { left: 0, top: (container.height - height) / 2, width: container.width, height };
  }, [container, aspect]);

  const toPixels = (box: BoundingBox, rect: Rect): Rect => ({
    left: rect.left + box.x * rect.width,
    top: rect.top + box.y * rect.height,
    width: Math.max(box.width * rect.width, 2),
    height: Math.max(box.height * rect.height, 2),
  });

  const visible = useMemo(() => {
    return localised.filter((incident) => {
      if (incident.id === pinnedId) return true;
      const seconds = timestampToSeconds(incident.timestamp);
      if (seconds === null) return false;
      return Math.abs(currentTime - seconds) <= BOX_VISIBLE_WINDOW_S;
    });
  }, [localised, pinnedId, currentTime]);

  const unlocalisedCount = incidents.length - localised.length;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.stage, { aspectRatio: aspect }]} onLayout={onLayout}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
          allowsFullscreen={false}
        />

        {/* Overlay must not swallow taps meant for the player controls. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {videoRect
            ? visible.map((incident) => {
                const box = toPixels(incident.region as BoundingBox, videoRect);
                const color = severityColors[incident.severity];
                const labelBelow = box.top < 22;
                return (
                  <View key={incident.id} style={[styles.box, box, { borderColor: color }]}>
                    <View
                      style={[
                        styles.tag,
                        { backgroundColor: color },
                        labelBelow ? styles.tagBelow : styles.tagAbove,
                      ]}
                    >
                      <Text style={styles.tagText} numberOfLines={1}>
                        {incidentTypeLabel(incident.incidentType).toUpperCase()}{' '}
                        {formatConfidence(incident.confidence)}
                      </Text>
                    </View>
                  </View>
                );
              })
            : null}
        </View>
      </View>

      <View style={styles.readout}>
        <Text style={styles.readoutText}>
          {secondsToTimestamp(currentTime)}
          {player.duration > 0 ? ` / ${secondsToTimestamp(player.duration)}` : ''}
        </Text>
        <Text style={styles.readoutHint}>
          {localised.length > 0
            ? `${visible.length} of ${localised.length} region${localised.length === 1 ? '' : 's'} shown`
            : 'No region localised'}
        </Text>
      </View>

      {localised.length > 0 ? (
        <View style={styles.chips}>
          {localised.map((incident) => {
            const color = severityColors[incident.severity];
            const active = incident.id === pinnedId;
            return (
              <Pressable
                key={incident.id}
                accessibilityRole="button"
                onPress={() => seekTo(incident)}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: color },
                  active ? { backgroundColor: `${color}26` } : null,
                  pressed ? styles.chipPressed : null,
                ]}
              >
                <Text style={[styles.chipText, { color }]} numberOfLines={1}>
                  {incident.timestamp || '—'} · {incidentTypeLabel(incident.incidentType)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {unlocalisedCount > 0 ? (
        <Text style={styles.note}>
          {unlocalisedCount} incident{unlocalisedCount === 1 ? '' : 's'} could not be localised in the
          frame, so no box is drawn for {unlocalisedCount === 1 ? 'it' : 'them'}.
        </Text>
      ) : null}

      {status === 'error' ? (
        <Text style={styles.error}>This clip could not be played back on this device.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  stage: {
    width: '100%',
    backgroundColor: colors.black,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
  },
  tag: {
    position: 'absolute',
    left: -2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 2,
    maxWidth: 220,
  },
  tagAbove: {
    top: -18,
  },
  tagBelow: {
    bottom: -18,
  },
  tagText: {
    color: '#0A0A0A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  readout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readoutText: {
    color: colors.text,
    fontSize: font.label,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  readoutHint: {
    color: colors.textDim,
    fontSize: font.micro,
    fontWeight: '700',
    letterSpacing: letterSpacing.wide,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
  note: {
    color: colors.textDim,
    fontSize: font.micro,
    lineHeight: 16,
  },
  error: {
    color: colors.critical,
    fontSize: font.label,
  },
});
