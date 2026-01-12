import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useApp } from './notifications';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function Tugas() {
  const { tasks, addTask, toggleTask, deleteTask, incompleteTasksCount } = useApp();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [text, setText] = useState('');

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'open') return tasks.filter(t => !t.done);
    return tasks.filter(t => t.done);
  }, [tasks, filter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Input Tugas */}
      <View style={[styles.inputCard, { backgroundColor: colors.card }]}>
        <TextInput
          placeholder="Tambah tugas baru..."
          placeholderTextColor={colors.icon}
          value={text}
          onChangeText={setText}
          style={[styles.input, { color: colors.text }]}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.tint }]}
          onPress={() => {
            if (text.trim()) {
              addTask(text.trim());
              setText('');
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* Filter */}
      {/* Ringkasan tugas belum selesai */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 6 }}>Tugas Belum Selesai ({incompleteTasksCount})</Text>
        {tasks.filter(t => !t.done).slice(0,3).map(t => (
          <View key={t.id} style={[styles.pendingRow, { backgroundColor: colors.card }]}> 
            <Text style={{ color: colors.text }}>{t.title}</Text>
          </View>
        ))}
      </View>
      <View style={styles.filterRow}>
        {['all', 'open', 'done'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f as 'all' | 'open' | 'done')}
            style={[
              styles.filterBtn,
              filter === f && { backgroundColor: colors.tint },
            ]}
          >
            <Text style={[styles.filterText, filter === f && { color: '#fff' }]}>
              {f === 'all' ? 'Semua' : f === 'open' ? 'Belum' : 'Selesai'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daftar Tugas */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={[styles.taskCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.checkbox}>
              <View style={[styles.dot, item.done && { backgroundColor: colors.tint }]} />
            </TouchableOpacity>
            <Text
              style={[
                styles.title,
                item.done && { textDecorationLine: 'line-through', color: '#888' },
                { color: colors.text },
              ]}
            >
              {item.title}
            </Text>
            <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.delBtn}>
              <Text style={{ color: '#D32F2F', fontWeight: '600' }}>Hapus</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 2,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
    marginRight: 8,
  },
  addBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  filterBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  filterText: { fontWeight: '600' },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  pendingRow: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  checkbox: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  title: { flex: 1, fontSize: 16 },
  delBtn: { padding: 6 },
});
