import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, font, letterSpacing, radius, spacing } from '../constants/theme';

export type ButtonVariant = 'primary' | 'critical' | 'secondary' | 'ghost' | 'demo' | 'success';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  helperText?: string;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.accent, border: colors.accent, text: colors.black },
  critical: { background: colors.critical, border: colors.critical, text: '#FFFFFF' },
  success: { background: colors.success, border: colors.success, text: colors.black },
  secondary: { background: colors.surfaceHigh, border: colors.borderStrong, text: colors.text },
  ghost: { background: 'transparent', border: colors.border, text: colors.textMuted },
  demo: { background: colors.demoSoft, border: colors.demo, text: colors.demo },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  loadingLabel,
  helperText,
  style,
}: AppButtonProps) {
  const palette = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: palette.background, borderColor: palette.border },
          pressed && !isDisabled ? styles.pressed : null,
          isDisabled ? styles.disabled : null,
        ]}
      >
        {loading ? <ActivityIndicator size="small" color={palette.text} /> : null}
        <Text style={[styles.label, { color: palette.text }]} numberOfLines={2}>
          {loading ? (loadingLabel ?? label) : label}
        </Text>
      </Pressable>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: font.body,
    fontWeight: '700',
    letterSpacing: letterSpacing.wide,
    textAlign: 'center',
  },
  helper: {
    color: colors.textDim,
    fontSize: font.micro,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
