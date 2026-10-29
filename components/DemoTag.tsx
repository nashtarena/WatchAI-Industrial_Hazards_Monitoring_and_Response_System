import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';
import { IncidentSource } from '../types/incident';

/** Simulated records must always be visually distinguishable from real analysis. */
export function DemoTag({ source }: { source: IncidentSource }) {
  if (source === 'GEMINI') return null;
  const label = source === 'DEMO' ? 'DEMO INCIDENT' : 'DEMO DATA';

  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.demo,
    backgroundColor: colors.demoSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    color: colors.demo,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
});
