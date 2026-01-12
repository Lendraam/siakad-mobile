import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useApp } from './notifications';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import api from '../../src/services/api';
import { getUser } from '../../src/services/auth';

export default function Pesan() {
  const { messages, markMessageRead, addLocalMessage } = useApp();
  const [currentUser, setCurrentUser] = useState<{ name?: string; nim?: string } | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [users, setUsers] = useState<Array<{ id?: number; nim?: string; name?: string }>>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState('');

  const sendMessage = async () => {
    if (!to.trim() || !text.trim()) return Alert.alert('Isi penerima dan pesan');
    setSending(true);
    try {
      const current = await getUser();
      // try resolve by name using debug users route (fallback to treating `to` as nim)
      let recipientNim = to.trim();
      // try match by name first
      try {
        const res = await api.get('/debug/users');
        const found = (res.data || []).find(u => u.name === to.trim() || u.nim === to.trim());
        if (found) recipientNim = found.nim;
      } catch (e) {
        // ignore; we'll try checking by nim below
      }

      // validate recipient exists on server
      try {
        await api.get(`/debug/user/${recipientNim}`);
      } catch (err) {
        Alert.alert('Penerima tidak ditemukan', 'Periksa nama atau NIM penerima');
        setSending(false);
        return;
      }

      const payload = { user_nim: recipientNim, from: current?.name || to.trim(), text: text.trim(), read: false };
      await api.post('/messages', payload);

      // persist sent message locally so sender can see it (outbox)
      addLocalMessage(current?.name || payload.from, payload.text);

      // show confirmation briefly
      setSentStatus('Terkirim');
      setTimeout(() => setSentStatus(''), 2200);

      setTo('');
      setText('');
    } catch (e: any) {
      Alert.alert('Gagal mengirim', e?.response?.data?.message || e.message || 'Error');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await getUser();
      setCurrentUser(u);
      // load known users for mapping
      try {
        const res = await api.get('/debug/users');
        setUsers(res.data || []);
      } catch (e) {
        setUsers([]);
      }
    })();
  }, []);

  const usersByNim: Record<string,string> = {};
  const usersByName: Record<string,string> = {};
  for (const u of users) {
    if (u.nim) usersByNim[u.nim] = u.name || u.nim;
    if (u.name) usersByName[u.name] = u.nim || u.name;
  }

  // derive contacts from messages
  const contactsMap: Record<string,{ nim: string; name: string }> = {};
  for (const m of messages) {
    if (m.user_nim && currentUser) {
      if (m.user_nim === currentUser.nim) {
        // incoming message: contact is sender (m.from)
        const nim = usersByName[m.from] || m.from;
        const name = usersByName[m.from] ? m.from : String(nim);
        contactsMap[String(nim)] = { nim: String(nim), name };
      } else {
        // outgoing message: contact is recipient (m.user_nim)
        const nim = m.user_nim;
        const name = usersByNim[nim] || nim;
        contactsMap[nim] = { nim, name };
      }
    }
  }
  const contacts = Object.values(contactsMap);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.composer, { backgroundColor: colors.card }]}>
        <TextInput
          placeholder="Kirim ke (nama atau NIM)"
          placeholderTextColor={colors.icon}
          value={to}
          onChangeText={setTo}
          style={[styles.input, { color: colors.text, backgroundColor: 'transparent', borderWidth: 0 }]}
        />
        <TextInput
          placeholder="Tulis pesan..."
          placeholderTextColor={colors.icon}
          value={text}
          onChangeText={setText}
          style={[styles.input, { color: colors.text, backgroundColor: 'transparent', borderWidth: 0 }]}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: '#0A7EA4' }]} onPress={sendMessage} disabled={sending}>
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Kirim</Text>}
        </TouchableOpacity>
      </View>

      {/* contacts list */}
      <View style={{ height: 64 }}>
        <FlatList
          data={contacts}
          horizontal
          keyExtractor={c => c.nim}
          contentContainerStyle={{ paddingHorizontal: 6 }}
          renderItem={({ item }) => {
            const isSelected = selectedContact === item.nim;
            const initials = (item.name || item.nim || '').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => setSelectedContact(item.nim)}
                style={[styles.contactChip, { backgroundColor: isSelected ? '#0A7EA4' : colors.card }]}
              >
                <View style={styles.contactInner}>
                  <View style={[styles.contactAvatar, { backgroundColor: isSelected ? '#fff' : '#d0d6d8' }]}>
                    <Text style={[styles.contactInitials, { color: isSelected ? '#0A7EA4' : '#374151' }]}>{initials}</Text>
                  </View>
                  <Text style={[styles.contactName, { color: isSelected ? '#fff' : colors.text }]}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={messages}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const unread = !item.read;
          const isOutgoing = currentUser && item.from === currentUser.name;
          // filter by selected contact
          if (selectedContact) {
            const showForContact = (item.user_nim && item.user_nim === selectedContact)
              || (item.user_nim && currentUser && item.user_nim === currentUser.nim && usersByName[item.from] === selectedContact)
              || (item.user_nim === undefined && usersByName[item.from] === selectedContact);
            if (!showForContact) return null;
          }

          return (
            <View style={{ marginBottom: 10, alignItems: isOutgoing ? 'flex-end' : 'flex-start' }}>
              <TouchableOpacity
                style={[
                  styles.bubble,
                  isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
                  { backgroundColor: isOutgoing ? '#0A7EA4' : colors.card },
                ]}
                onPress={() => markMessageRead(item.id)}
              >
                <Text style={[styles.from, { color: isOutgoing ? '#fff' : colors.text }]} numberOfLines={1}>
                  {isOutgoing ? 'Anda' : item.from}
                </Text>
                <Text style={[styles.preview, { color: isOutgoing ? '#e6f7fb' : colors.icon }]}>{item.text}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },

  left: { marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd' },
  from: { fontSize: 14, marginBottom: 6 },
  preview: { fontSize: 15 },
  composer: { padding: 12, borderRadius: 10, marginBottom: 12 },
  input: { height: 44, paddingHorizontal: 10, borderRadius: 8, marginBottom: 8 },
  sendBtn: { height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 12 },
  bubbleIncoming: { borderTopLeftRadius: 4 },
  bubbleOutgoing: { borderTopRightRadius: 4 },
  contactChip: { padding: 8, marginRight: 8, borderRadius: 10 },
  contactInner: { flexDirection: 'row', alignItems: 'center' },
  contactAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactInitials: { fontWeight: '700' },
  contactName: { marginLeft: 8 },
});
