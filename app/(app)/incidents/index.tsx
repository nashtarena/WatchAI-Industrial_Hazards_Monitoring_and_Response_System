import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../../../components/EmptyState';
import { FilterChips, FilterOption } from '../../../components/FilterChips';
import { IncidentCard } from '../../../components/IncidentCard';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { OPEN_STATUSES } from '../../../constants/incidentTypes';
import { colors, spacing } from '../../../constants/theme';
import { useWatchAI } from '../../../hooks/useWatchAI';
import { Incident } from '../../../types/incident';

type IncidentFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED' | 'RESOLVED';

function matchesFilter(incident: Incident, filter: IncidentFilter): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'CRITICAL':
    case 'HIGH':
    case 'MEDIUM':
    case 'LOW':
      return incident.severity === filter;
    case 'UNRESOLVED':
      return OPEN_STATUSES.includes(incident.status);
    case 'RESOLVED':
      return incident.status === 'RESOLVED';
    default:
      return true;
  }
}

export default function IncidentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { incidents } = useWatchAI();
  const [filter, setFilter] = useState<IncidentFilter>('ALL');

  const options = useMemo<FilterOption<IncidentFilter>[]>(() => {
    const count = (value: IncidentFilter) => incidents.filter((item) => matchesFilter(item, value)).length;
    return [
      { value: 'ALL', label: 'All', count: count('ALL') },
      { value: 'CRITICAL', label: 'Critical', count: count('CRITICAL'), accent: colors.critical },
      { value: 'HIGH', label: 'High', count: count('HIGH'), accent: colors.high },
      { value: 'MEDIUM', label: 'Medium', count: count('MEDIUM'), accent: colors.medium },
      { value: 'LOW', label: 'Low', count: count('LOW'), accent: colors.low },
      { value: 'UNRESOLVED', label: 'Unresolved', count: count('UNRESOLVED'), accent: colors.medium },
      { value: 'RESOLVED', label: 'Resolved', count: count('RESOLVED'), accent: colors.success },
    ];
  }, [incidents]);

  // The store already returns incidents newest-first.
  const visible = useMemo(
    () => incidents.filter((incident) => matchesFilter(incident, filter)),
    [incidents, filter],
  );

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
        eyebrow="Human review"
        title="Incidents"
        subtitle="Newest first. Every record is held in local app state."
      />

      <FilterChips options={options} selected={filter} onSelect={setFilter} />

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing to show"
          message="No incident matches this filter. Analyse a clip or run demo mode to create one."
        />
      ) : (
        <View style={styles.list}>
          {visible.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
            />
          ))}
        </View>
      )}
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
    gap: spacing.sm,
  },
  list: {
    gap: spacing.sm,
  },
});
