import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useApp } from './notifications';
import { getUser } from '../../src/services/auth';
import { getData, saveData } from '../../src/services/storage';
import * as Notifications from 'expo-notifications';

const WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const { width } = Dimensions.get('window');

type ScheduleItem = {
  id: string;
  mk: string;
  jam: string;
  ruang: string;
  dosen: string;
};

// Key 1..5 (Senin..Jumat)
const sampleSchedule: Record<number, ScheduleItem[]> = {
  1: [
    { id: 's1', mk: 'Algoritma', jam: '08:00-09:40', ruang: 'R101', dosen: 'Dr. A' },
    { id: 's2', mk: 'Matematika', jam: '10:00-11:30', ruang: 'R102', dosen: 'Dr. B' },
  ],
  2: [],
  3: [
    { id: 's3', mk: 'Basis Data', jam: '13:00-14:40', ruang: 'R201', dosen: 'Ibu C' },
  ],
  4: [],
  5: [],
};

export default function Jadwal() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const today = new Date().getDay(); // 0 = Minggu
  const mappedToday = (today >= 1 && today <= 5) ? today : 1; // map Monday..Friday -> 1..5, default 1

  const computeStatusForItem = (jam: string, dayIndex: number) => {
    // only compute relative to today
    const today = new Date();
    const todayIndex = (today.getDay() >= 1 && today.getDay() <= 5) ? today.getDay() : 1;
    if (dayIndex !== todayIndex) return null;

    const now = new Date();
    // parse jam like '08:00-09:40'
    if (!jam || typeof jam !== 'string') return null;
    const parts = jam.split('-').map(p => p.trim());
    if (parts.length < 2) return null;
    const [startStr, endStr] = parts;
    const parseTime = (str: string, base: Date) => {
      const [hh, mm] = str.split(':').map(s => parseInt(s, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      const d = new Date(base);
      d.setHours(hh, mm, 0, 0);
      return d;
    };

    const start = parseTime(startStr, today);
    const end = parseTime(endStr, today);
    if (!start || !end) return null;

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    if (now > end) return 'selesai';
    if (now >= start && now <= end) return 'berlangsung';
    if (end > now && end <= endOfDay) return 'akan';
    return null;
  };

  const [selected, setSelected] = useState<number>(mappedToday);
  const { courses, addCourse, markAttendance, removeCourse } = useApp();
  const [nim, setNim] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState('');
  const [schedule, setSchedule] = useState<Record<number, ScheduleItem[]>>(sampleSchedule);

  // fields for adding schedule
  const [mk, setMk] = useState('');
  const [jam, setJam] = useState('');
  const [ruang, setRuang] = useState('');
  const [dosen, setDosen] = useState('');
  const [targetDay, setTargetDay] = useState<number>(mappedToday);

  useEffect(() => {
    (async () => {
      try {
        const saved = (await getData('siakad_schedule')) || null;
        if (saved) {
          setSchedule(saved);
        } else {
          setSchedule(sampleSchedule);
        }
      } catch (e) {
        setSchedule(sampleSchedule);
      }
    })();
    (async () => {
      try {
        const u = await getUser();
        setNim(u?.nim || null);
      } catch (e) {
        setNim(null);
      }
    })();
  }, []);

  // akses aman
  const items: ScheduleItem[] = schedule[selected] ?? [];

  const dayButtonWidth = Platform.OS === 'web' ? 120 : Math.max(56, (width - 32 - 4 * 8) / 5);

  const persistSchedule = async (next: Record<number, ScheduleItem[]>) => {
    try {
      await saveData('siakad_schedule', next);
    } catch (e) {}
  };

  const handleAddSchedule = () => {
    if (!mk.trim() || !jam.trim()) return Alert.alert('Harap isi mata kuliah dan jam');
    const id = Date.now().toString();
    const item: ScheduleItem = { id, mk: mk.trim(), jam: jam.trim(), ruang: ruang.trim(), dosen: dosen.trim() };
    const next = { ...schedule };
    next[targetDay] = [item, ...(next[targetDay] || [])];
    setSchedule(next);
    persistSchedule(next);
    // clear fields
    setMk(''); setJam(''); setRuang(''); setDosen('');
    // optionally switch view to that day
    setSelected(targetDay);
  };

  const handleDelete = (day: number, id: string) => {
    const next = { ...schedule };
    next[day] = (next[day] || []).filter(s => s.id !== id);
    setSchedule(next);
    persistSchedule(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ width: '100%' }}>
        <View style={styles.content}>
      {/* Row Hari */}
      <View style={styles.weekRow}>
        {WEEK.map((d, idx) => {
          const dayIndex = idx + 1;
          const isToday = dayIndex === mappedToday;
          const selectedDay = dayIndex === selected;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => setSelected(dayIndex)}
              style={[
                styles.day,
                { width: dayButtonWidth, height: Platform.OS === 'web' ? 42 : undefined },
                { backgroundColor: selectedDay ? colors.tint : colors.card },
                isToday && { borderWidth: 2, borderColor: colors.tint },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: selectedDay ? '#fff' : colors.text, fontSize: Platform.OS === 'web' ? 14 : 16 },
                ]}
              >
                {d}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Jadwal */}
      <View style={styles.listContainer}>

        {/* Add course quick input */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TextInput
            placeholder="Tambah matkul baru"
            placeholderTextColor={colors.icon}
            value={newCourse}
            onChangeText={setNewCourse}
            style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.card, color: colors.text, marginRight: 8 }}
          />
          <TouchableOpacity
            onPress={() => {
              if (newCourse.trim()) {
                addCourse(newCourse.trim());
                setNewCourse('');
              }
            }}
            style={{ backgroundColor: colors.tint, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Tambah</Text>
          </TouchableOpacity>
        </View>

        {/* New schedule form (choose day) */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Tambah Jadwal</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>
            {[1,2,3,4,5].map(d => (
              <TouchableOpacity key={d} onPress={() => setTargetDay(d)} style={{ padding: 8, borderRadius: 8, marginRight: 8, marginBottom: 8, backgroundColor: targetDay===d?colors.tint:colors.card }}>
                <Text style={{ color: targetDay===d? '#fff': colors.text }}>{d === mappedToday ? 'Hari Ini' : WEEK[d-1]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ marginBottom: 8 }}>
            <TextInput placeholder="Mata Kuliah" placeholderTextColor={colors.icon} value={mk} onChangeText={setMk} style={{ padding: 10, borderRadius: 8, backgroundColor: colors.card, color: colors.text, marginBottom: 8 }} />
            <TextInput placeholder="Jam (08:00-09:40)" placeholderTextColor={colors.icon} value={jam} onChangeText={setJam} style={{ padding: 10, borderRadius: 8, backgroundColor: colors.card, color: colors.text, marginBottom: 8 }} />
            <TextInput placeholder="Ruang" placeholderTextColor={colors.icon} value={ruang} onChangeText={setRuang} style={{ padding: 10, borderRadius: 8, backgroundColor: colors.card, color: colors.text, marginBottom: 8 }} />
            <TextInput placeholder="Dosen" placeholderTextColor={colors.icon} value={dosen} onChangeText={setDosen} style={{ padding: 10, borderRadius: 8, backgroundColor: colors.card, color: colors.text }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={handleAddSchedule} style={{ backgroundColor: colors.tint, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Tambah Jadwal</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Courses (presensi) */}
        {courses && courses.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Mata Kuliah</Text>
            {courses.map(c => {
              const today = new Date();
              const key = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              const didToday = (c.attendances || []).some((a: any) => {
                if (!a) return false;
                if (typeof a !== 'string') return false;
                if (a === key) return true;
                if (nim && a === `${key}|${nim}`) return true;
                return false;
              });
              return (
                <View key={c.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mk, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[styles.info, { color: colors.secondaryText ?? colors.icon }]}>{c.code || ''}</Text>
                  </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {/* status badge for today's schedule */}
                      {(() => {
                        const status = computeStatusForItem(c.jam || c.time || '', mappedToday);
                        if (!status) return null;
                        const bg = status === 'selesai' ? '#D32F2F' : status === 'berlangsung' ? '#4CAF50' : '#FF9800';
                        const label = status === 'selesai' ? 'Selesai' : status === 'berlangsung' ? 'Berlangsung' : 'Akan';
                        return (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: bg, marginRight: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{label}</Text>
                          </View>
                        );
                      })()}
                    <TouchableOpacity onPress={() => markAttendance(c.id)} style={{ padding: 8, borderRadius: 8, backgroundColor: didToday ? '#9E9E9E' : colors.tint, marginRight: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>{didToday ? 'Sudah' : 'Presensi'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={async () => {
                      try {
                        // schedule an immediate test notification in 2 seconds
                        await Notifications.scheduleNotificationAsync({
                          content: { title: 'Tes Notifikasi', body: `Ingat presensi: ${c.name}` },
                          trigger: { seconds: 2, repeats: false, type: 'timeInterval' as any },
                        });
                      } catch (e) {
                        // ignore
                      }
                    }} style={{ padding: 8, marginRight: 8, borderRadius: 8, backgroundColor: '#444', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Tes Notif</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => {
                      if (Platform.OS === 'web') {
                        try {
                          if (window.confirm(`Hapus mata kuliah "${c.name}"?`)) {
                            removeCourse(c.id);
                          }
                        } catch (e) {
                          // fallback to remove
                          removeCourse(c.id);
                        }
                      } else {
                        Alert.alert('Hapus Matkul', `Hapus mata kuliah "${c.name}"?`, [
                          { text: 'Batal', style: 'cancel' },
                          { text: 'Hapus', style: 'destructive', onPress: () => removeCourse(c.id) }
                        ]);
                      }
                    }} style={{ padding: 8, backgroundColor: '#D32F2F', borderRadius: 8 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {items.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.icon }]}>Tidak ada jadwal</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.tint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View>
                  <Text style={[styles.mk, { color: colors.text }]}>{item.mk}</Text>
                  <Text style={[styles.info, { color: colors.secondaryText ?? colors.icon }]}>
                    {item.jam} • {item.ruang}
                  </Text>
                  <Text style={[styles.info, { color: colors.secondaryText ?? colors.icon }]}>
                    {item.dosen}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => handleDelete(selected, item.id)} style={{ padding: 8, backgroundColor: '#D32F2F', borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  day: {
    minWidth: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontWeight: '700', fontSize: 16 },
  listContainer: { marginTop: 8 },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mk: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  info: { fontSize: 14 },
});
