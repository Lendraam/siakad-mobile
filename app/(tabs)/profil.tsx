import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform, Alert, Switch } from 'react-native';
import { getUser, logout } from '../../src/services/auth';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getData, saveData, onUserChange } from '../../src/services/storage';
import api from '../../src/services/api';
import { requestPermissionAndGetToken } from '../../src/services/firebase';

const { width } = Dimensions.get('window');

export default function Profil() {
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [prodi, setProdi] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [agreeToChange, setAgreeToChange] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    let mounted = true;
    (async () => {
      // prefer stored user
      const stored = await getData('user');
      if (mounted && stored) {
        setUser(stored);
        setName(stored?.name ?? '');
        setNim(stored?.nim ?? '');
        setProdi(stored?.prodi ?? '');
        setEmail(stored?.email ?? '');
        setAvatar(stored?.avatar ?? null);
        return;
      }
      const u = await getUser();
      if (mounted) {
        setUser(u);
        setName(u?.name ?? '');
        setNim(u?.nim ?? '');
        setProdi(u?.prodi ?? '');
        setEmail(u?.email ?? '');
        setAvatar(u?.avatar ?? null);
        try {
          const t = await getData('notif_time');
          if (t) setNotifTime(t);
        } catch (e) {}
      }
    })();

    const unsub = onUserChange((v: any) => {
      if (mounted) {
        setUser(v);
        setName(v?.name ?? '');
        setNim(v?.nim ?? '');
        setProdi(v?.prodi ?? '');
        setEmail(v?.email ?? '');
        setAvatar(v?.avatar ?? null);
      }
    });
    return () => { mounted = false; unsub && unsub(); };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: true });
      if (!result.canceled && result.assets && result.assets[0] && (result.assets[0] as any).base64) {
        const dataUri = `data:image/jpeg;base64,${(result.assets[0] as any).base64}`;
        setAvatar(dataUri);
        if (!editing) {
          const updated = { ...(user || {}), avatar: dataUri };
          await saveData('user', updated);
          setUser(updated);
        }
      }
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin ditolak', 'Ijinkan akses foto untuk mengganti avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, base64: false });
    if (!result.canceled && result.assets && result.assets[0] && (result.assets[0] as any).uri) {
      const srcUri = (result.assets[0] as any).uri as string;
      try {
        const filename = srcUri.split('/').pop() || `avatar_${Date.now()}.jpg`;
        const destDir = (FileSystem as any).documentDirectory + 'avatars/';
        // ensure directory
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
        const dest = destDir + filename;
        await FileSystem.copyAsync({ from: srcUri, to: dest });
        setAvatar(dest);
        if (!editing) {
          const updated = { ...(user || {}), avatar: dest };
          await saveData('user', updated);
          setUser(updated);
        }
      } catch (e) {
        // fallback to using original uri
        setAvatar(srcUri);
        if (!editing) {
          const updated = { ...(user || {}), avatar: srcUri };
          await saveData('user', updated);
          setUser(updated);
        }
      }
    }
  };

  const saveProfile = async () => {
    if (editing && !agreeToChange) {
      Alert.alert('Konfirmasi', 'Silakan setuju perubahan sebelum menyimpan');
      return;
    }
    const updated = { ...(user || {}), name, nim, prodi, email, avatar };
    await saveData('user', updated);
    setUser(updated);
    setEditing(false);
    setAgreeToChange(false);
  };

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifTime, setNotifTime] = useState('08:00');

  const changePassword = async () => {
    if (!user?.nim) return Alert.alert('Error', 'User not found');
    if (!oldPassword || !newPassword) return Alert.alert('Error', 'Isi semua field');
    try {
      const res = await api.post('/user/change-password', { nim: user.nim, old_password: oldPassword, new_password: newPassword });
      Alert.alert('Sukses', res.data?.message || 'Password updated');
      setShowPwdModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err: any) {
      const msg = err && (err.response?.data?.message || err.message) ? (err.response?.data?.message || err.message) : 'Error';
      Alert.alert('Gagal', msg);
    }
  };

  const enableNotifications = async () => {
    if (!user?.nim) return Alert.alert('Error', 'User not found');
    try {
      const token = await requestPermissionAndGetToken();
      if (token) {
        await api.post('/user/fcm-token', { nim: user.nim, fcm_token: token });
        Alert.alert('Sukses', 'Notifikasi diaktifkan');
      }
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Tidak dapat mengaktifkan notifikasi');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Header Avatar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={avatar ? { uri: avatar } : require('../../assets/images/logo-kampus.png')}
            style={[styles.avatar, { borderColor: colorScheme === 'dark' ? colors.background : '#ccc' }]}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.changePhoto} onPress={pickImage}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>Ganti Foto</Text>
        </TouchableOpacity>
      </View>

      {/* Card Profil */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {!editing ? (
          <>
            <Text style={styles.label}>Nama</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user?.name ?? '-'}</Text>

            <Text style={styles.label}>NIM</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user?.nim ?? '-'}</Text>

            <Text style={styles.label}>Prodi</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user?.prodi ?? '-'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Nama</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
              placeholder="Masukkan nama"
              placeholderTextColor={colors.icon}
            />

            <Text style={styles.label}>NIM</Text>
            <TextInput
              value={nim}
              onChangeText={setNim}
              style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
              placeholder="Masukkan NIM"
              placeholderTextColor={colors.icon}
            />

            <Text style={styles.label}>Prodi</Text>
            <TextInput
              value={prodi}
              onChangeText={setProdi}
              style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
              placeholder="Masukkan Prodi"
              placeholderTextColor={colors.icon}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { borderColor: colors.tint, color: colors.text }]}
              placeholder="Masukkan email"
              placeholderTextColor={colors.icon}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Switch value={agreeToChange} onValueChange={setAgreeToChange} />
              <Text style={{ marginLeft: 10, color: colors.text }}>Saya setuju data saya diubah</Text>
            </View>
          </>
        )}
        <TouchableOpacity
          onPress={editing ? saveProfile : () => { setEditing(true); setAgreeToChange(false); }}
          style={[styles.button, { backgroundColor: colors.tint }]}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{editing ? 'Simpan' : 'Edit Profil'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { marginTop: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.tint }]} onPress={() => setShowPwdModal(true)}>
          <Text style={{ color: colors.tint, fontWeight: '600' }}>Ganti Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { marginTop: 8, backgroundColor: '#0A7EA4' }]} onPress={enableNotifications}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Aktifkan Notifikasi</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 12, width: '100%' }}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>Waktu Notifikasi Harian</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <TextInput
              value={notifTime}
              onChangeText={setNotifTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.icon}
              style={[styles.input, { width: 110, marginRight: 8, borderColor: colors.tint, color: colors.text }]}
            />
            <TouchableOpacity onPress={async () => {
              if (!/^[0-2]?\d:[0-5]\d$/.test(notifTime)) { Alert.alert('Format salah', 'Gunakan format HH:MM'); return; }
              try {
                await saveData('notif_time', notifTime);
                Alert.alert('Disimpan', `Notifikasi akan dikirim setiap hari pada ${notifTime}`);
              } catch (e) { Alert.alert('Gagal', 'Tidak dapat menyimpan preferensi'); }
            }} style={[styles.button, { paddingHorizontal: 14, backgroundColor: colors.tint, marginTop: 0 }]}> 
              <Text style={{ color: '#fff', fontWeight: '600' }}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password modal simple inline */}
        {showPwdModal && (
          <View style={[styles.pwdModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.text }]}>Password Lama</Text>
            <TextInput value={oldPassword} onChangeText={setOldPassword} secureTextEntry style={[styles.input, { borderColor: colors.tint, color: colors.text }]} placeholder="Password lama" placeholderTextColor={colors.icon} />
            <Text style={[styles.label, { color: colors.text }]}>Password Baru</Text>
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry style={[styles.input, { borderColor: colors.tint, color: colors.text }]} placeholder="Password baru" placeholderTextColor={colors.icon} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: colors.tint }]} onPress={changePassword}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Simpan</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#ccc' }]} onPress={() => setShowPwdModal(false)}><Text style={{ textAlign: 'center', fontWeight: '600' }}>Batal</Text></TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { marginTop: 8, backgroundColor: '#D32F2F' }]}
          onPress={handleLogout}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 8, borderWidth: 2, borderColor: '#ccc' },
  changePhoto: { padding: 6 },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pwdModal: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
  label: { fontSize: 12, color: '#666', marginTop: 12 },
  value: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 6, backgroundColor: '#f3f3f3' },
  button: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
});
