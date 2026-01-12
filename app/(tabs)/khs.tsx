import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';
import { getUser } from '../../src/services/auth';
import { fetchKHSForNim, fetchKHSFromRTDB, buildRTDBKhsQueryUrl, fetchAllKHSFromRTDB } from '../../src/services/firebase';

const FALLBACK_COURSES = [
  { id: '1', name: 'Pemrograman Mobile', grade: 'A' },
  { id: '2', name: 'Basis Data', grade: 'A-' },
  { id: '3', name: 'Rekayasa Perangkat Lunak', grade: 'B+' },
  { id: '4', name: 'Sistem Informasi', grade: 'A' },
];

export default function KHS() {
  const tint = useThemeColor({}, 'tint');
  const [loading, setLoading] = useState(true);
  const [khs, setKhs] = useState<any | null>(null);
  const [allKhs, setAllKhs] = useState<any[] | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [debugRaw, setDebugRaw] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Load all KHS entries from RTDB and display them. Also load first record into khs for single-view compatibility.
        const all = await fetchAllKHSFromRTDB();
        setAllKhs(all);
        if (all && all.length > 0) setKhs(all[0]);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { backgroundColor: tint }] as any}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>‹ Kembali</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Kartu Hasil Studi
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headerSubtitle}>
          Semester Ganjil • 2025/2026
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={tint} />
        ) : (
          <>
            {/* If multiple KHS entries exist, render a list */}
            {(allKhs && allKhs.length > 0) ? (
              allKhs.map((entry, idx) => (
                <View key={entry.id || idx} style={[styles.cardKhs, { backgroundColor: 'rgba(10,126,164,0.03)' }]}>
                  <ThemedText style={{ fontWeight: '700' }}>{entry.name || entry.nim || `KHS ${idx+1}`}</ThemedText>
                  <ThemedText style={{ fontSize: 12, color: '#666' }}>{entry.semester || '-'} • {entry.year || '-'}</ThemedText>
                  {(entry.courses || []).map((c: any, i: number) => (
                    <View key={c.code || i} style={styles.row}>
                      <ThemedText style={styles.courseName}>{i + 1}. {c.name}</ThemedText>
                      <View style={[styles.badge, { borderColor: tint, backgroundColor: tint + '20' }]}>
                        <ThemedText style={styles.badgeText}>{c.grade}</ThemedText>
                      </View>
                    </View>
                  ))}
                  <View style={styles.summary}>
                    <ThemedText type="defaultSemiBold">IPK</ThemedText>
                    <ThemedText type="defaultSemiBold" style={styles.ipkValue}>{entry.gpa ?? '—'}</ThemedText>
                  </View>
                </View>
              ))
            ) : (
              // fallback single view
              <>
                {(khs?.courses || FALLBACK_COURSES).map((c: any, idx: number) => (
                  <View key={c.code || c.id || idx} style={styles.row}>
                    <ThemedText style={styles.courseName}>{idx + 1}. {c.name}</ThemedText>
                    <View style={[styles.badge, { borderColor: tint, backgroundColor: tint + '20' }]}>
                      <ThemedText style={styles.badgeText}>{c.grade}</ThemedText>
                    </View>
                  </View>
                ))}

                <View style={styles.summary}>
                  <ThemedText type="defaultSemiBold">IPK</ThemedText>
                  <ThemedText type="defaultSemiBold" style={styles.ipkValue}>{khs?.gpa ?? '—'}</ThemedText>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  headerTitle: { color: '#fff' },
  headerSubtitle: { color: '#e6f7fb', marginTop: 6 },
  content: { padding: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(10,126,164,0.04)'
  },
  courseName: { flex: 1, marginRight: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
  badgeText: { color: '#0a7ea4', fontWeight: '600' },
  summary: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(10,126,164,0.06)',
    borderRadius: 10,
  },
  ipkValue: { color: '#0a7ea4' },
  backButton: { marginBottom: 8 },
  backText: { color: '#fff', fontWeight: '600' },
  cardKhs: { padding: 12, borderRadius: 10, marginBottom: 12 },
});
