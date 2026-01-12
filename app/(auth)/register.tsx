import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ImageBackground, Text } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { register } from '../../src/services/auth';
import { router } from 'expo-router';

export default function Register() {
  const [nim, setNim] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [regType, setRegType] = useState<'reguler' | 'non-reguler'>('reguler');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tint = useThemeColor({}, 'tint');

  const handleRegister = async () => {
    setError('');
    if (!nim.trim() || !name.trim() || !password) {
      setError('Isi semua field yang wajib');
      return;
    }
    if (password !== confirm) {
      setError('Password dan konfirmasi tidak sama');
      return;
    }
    setLoading(true);
    try {
      await register(nim.trim(), name.trim(), password, email.trim() || null, regType);
      router.replace('/');
    } catch (e: any) {
      setError(e?.message || 'Register gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ImageBackground source={require('../../assets/images/background-login.jpg')} style={styles.background} resizeMode="cover">
        <View style={styles.overlay} />
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', default: undefined })} style={styles.centerWrap}>
          <View style={styles.card}>
            <ThemedText type="title" style={styles.cardTitle}>Daftar</ThemedText>
            <View style={styles.form}>
              <ThemedText type="defaultSemiBold" style={styles.label}>NIM</ThemedText>
              <TextInput value={nim} onChangeText={setNim} style={styles.input} placeholder="Masukkan NIM" placeholderTextColor="#9AA6AA" autoCapitalize="none" />

              <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Nama</ThemedText>
              <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Masukkan nama" placeholderTextColor="#9AA6AA" autoCapitalize="words" />

              <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Email (opsional)</ThemedText>
              <TextInput value={email} onChangeText={setEmail} style={styles.input} placeholder="Email" placeholderTextColor="#9AA6AA" autoCapitalize="none" keyboardType="email-address" />

              <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Password</ThemedText>
              <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} placeholder="Password" placeholderTextColor="#9AA6AA" />

              <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Konfirmasi Password</ThemedText>
              <TextInput secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input} placeholder="Konfirmasi" placeholderTextColor="#9AA6AA" />

              <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Tipe Pendaftaran</ThemedText>
              <View style={styles.selectorRow}>
                <TouchableOpacity onPress={() => setRegType('reguler')} style={[styles.selectorButton, { backgroundColor: regType === 'reguler' ? tint : 'transparent' }]}> 
                  <Text style={[styles.selectorText, { color: regType === 'reguler' ? '#fff' : '#111' }]}>Reguler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRegType('non-reguler')} style={[styles.selectorButton, { backgroundColor: regType === 'non-reguler' ? tint : 'transparent' }]}> 
                  <Text style={[styles.selectorText, { color: regType === 'non-reguler' ? '#fff' : '#111' }]}>Non-Reguler</Text>
                </TouchableOpacity>
              </View>

              {error !== '' && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity style={[styles.button, { backgroundColor: tint }]} onPress={handleRegister}>
                {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Daftar</ThemedText>}
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.replace('/(auth)/login')}>
                <Text style={{ color: tint, textAlign: 'center' }}>Sudah punya akun? Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '92%', maxWidth: 480, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 18, elevation: 4, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)' },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  cardTitle: { marginBottom: 6 },
  form: { width: '100%', paddingTop: 8 },
  label: { marginBottom: 6 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 12, backgroundColor: 'rgba(10,126,164,0.04)', borderWidth: 1, borderColor: 'rgba(10,126,164,0.12)', color: '#11181C' },
  card: { width: '92%', maxWidth: 480, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, elevation: 4, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)' },
  input: { height: 40, borderRadius: 8, paddingHorizontal: 10, backgroundColor: 'rgba(10,126,164,0.04)', borderWidth: 1, borderColor: 'rgba(10,126,164,0.12)', color: '#11181C' },
  button: { marginTop: 12, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#c0392b', marginTop: 10 },
  selectorRow: { flexDirection: 'row', marginBottom: 6, marginTop: 6 },
  selectorButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  selectorText: { fontSize: 13, fontWeight: '600' },
});
