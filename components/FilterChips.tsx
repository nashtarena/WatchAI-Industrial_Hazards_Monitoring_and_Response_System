import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  accent?: string;
}

interface FilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export function FilterChips<T extends string>({ options, selected, onSelect }: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {options.map((option) => {
        const isActive = option.value === selected;
        const accent = option.accent ?? colors.accent;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(option.value)}
            style={[
              styles.chip,
              isActive ? { borderColor: accent, backgroundColor: `${accent}1F` } : null,
            ]}
          >
            <Text style={[styles.label, isActive ? { color: accent } : null]}>
              {option.label.toUpperCase()}
              {typeof option.count === 'number' ? ` ${option.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: font.micro,
    fontWeight: '800',
    letterSpacing: letterSpacing.wide,
  },
});
