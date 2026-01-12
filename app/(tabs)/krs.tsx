import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { router } from 'expo-router';

const COURSES = [
  { id: '1', name: 'Pemrograman Mobile', sks: 3 },
  { id: '2', name: 'Basis Data', sks: 3 },
  { id: '3', name: 'Rekayasa Perangkat Lunak', sks: 3 },
  { id: '4', name: 'Sistem Informasi', sks: 3 },
];

export default function KRS() {
  const tint = useThemeColor({}, 'tint');

  const total = COURSES.reduce((s, c) => s + c.sks, 0);

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { backgroundColor: tint }] as any}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backText}>‹ Kembali</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Kartu Rencana Studi
        </ThemedText>
        <ThemedText type="subtitle" style={styles.headerSubtitle}>
          Semester Ganjil • 2025/2026
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {COURSES.map((c, idx) => (
          <View key={c.id} style={styles.row}>
            <ThemedText style={styles.courseName}>{idx + 1}. {c.name}</ThemedText>
            <View style={[styles.sksBox, { borderColor: tint, backgroundColor: tint + '12' }]}>
              <ThemedText style={styles.sksText}>{c.sks} SKS</ThemedText>
            </View>
          </View>
        ))}

        <View style={styles.summary}>
          <ThemedText type="defaultSemiBold">Total SKS</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.totalValue}>{total}</ThemedText>
        </View>
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
  sksBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 64,
    alignItems: 'center',
  },
  sksText: { color: '#0a7ea4', fontWeight: '600' },
  summary: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(10,126,164,0.06)',
    borderRadius: 10,
  },
  totalValue: { color: '#0a7ea4' },
  backButton: { marginBottom: 8 },
  backText: { color: '#fff', fontWeight: '600' },
});

