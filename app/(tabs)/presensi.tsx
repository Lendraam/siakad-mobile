import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApp } from './notifications';
import { getUser } from '../../src/services/auth';

export default function Presensi() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { courses, markAttendance, removeCourse } = useApp();
  const [nim, setNim] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await getUser();
        setNim(u?.nim || null);
      } catch (e) {
        setNim(null);
      }
    })();
  }, []);

  const onDelete = (cId: string, name: string) => {
    Alert.alert('Hapus Matkul', `Hapus mata kuliah "${name}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => removeCourse(cId) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Presensi</Text>

      {(!courses || courses.length === 0) ? (
        <Text style={{ color: colors.icon }}>Belum ada mata kuliah. Tambah di Jadwal.</Text>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={i => i.id}
          renderItem={({ item }) => {
            const today = new Date();
            const key = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            const didToday = (item.attendances || []).some((a: any) => {
              if (!a) return false;
              if (typeof a !== 'string') return false;
              if (a === key) return true; // legacy entry
              if (nim && a === `${key}|${nim}`) return true; // per-user entry
              return false;
            });
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.tint }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mk, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.info, { color: colors.secondaryText ?? colors.icon }]}>{(item.attendances||[]).length} kali hadir</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => markAttendance(item.id)} style={[styles.btn, { backgroundColor: didToday ? '#9E9E9E' : colors.tint }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{didToday ? 'Sudah' : 'Presensi'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(item.id, item.name)} style={[styles.btn, { backgroundColor: '#D32F2F', marginLeft: 8 }]}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  mk: { fontWeight: '700', fontSize: 16 },
  info: { fontSize: 14 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
});
