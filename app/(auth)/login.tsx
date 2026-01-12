import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { login } from '../../src/services/auth';
import { requestPermissionAndGetToken } from '../../src/services/firebase';
import api from '../../src/services/api';
import { router } from 'expo-router';

export default function Login() {
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tint = useThemeColor({}, 'tint');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await login(nim.trim(), password);

      // try request notification permission and register token
      try {
        const token = await requestPermissionAndGetToken();
        if (token) {
          await api.post('/user/fcm-token', { nim: user.nim, fcm_token: token });
          // send a quick test push so notification appears on this device
          try {
            await api.post('/debug/send-push', { token, title: 'Tes Notifikasi', body: 'Notifikasi berhasil didaftarkan.' });
          } catch (e) {
            // ignore debug push failures
          }
          // Also show any existing unread messages as immediate Notifications (foreground)
          try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              const res = await api.get(`/messages?nim=${user.nim}`);
              const msgs = res.data || [];
              for (const m of msgs.filter((x: any) => !x.read)) {
                try {
                  new Notification(`Pesan dari ${m.from}`, { body: String(m.text), tag: `msg-${m.id}` });
                } catch (err) {
                  // ignore per-message failures
                }
              }
            }
          } catch (err) {
            // ignore notification display errors
          }
        }
      } catch (e) {
        // permission denied or messaging unavailable — ignore silently
      }

      router.replace('/');
    } catch (e: any) {
      const msg = e?.message || 'NIM atau Password salah';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {loading && (
        <View style={styles.overlayFull} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Sedang masuk...</Text>
        </View>
      )}
      <ImageBackground
        source={require('../../assets/images/background-login.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', default: undefined })}
          style={styles.centerWrap}
        >
          <View style={styles.card}>
          <Image
            source={require('../../assets/images/logo-kampus.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <ThemedText type="title" style={styles.cardTitle}>SIAKAD</ThemedText>
          <ThemedText type="subtitle" style={styles.cardSubtitle}>Sistem Informasi Akademik</ThemedText>

          <View style={styles.form}>
            <ThemedText type="defaultSemiBold" style={styles.label}>NIM</ThemedText>
            <TextInput
              value={nim}
              onChangeText={setNim}
              style={styles.input}
              placeholder="Masukkan NIM"
              placeholderTextColor="#9AA6AA"
              autoCapitalize="none"
              keyboardType="default"
              returnKeyType="next"
            />

            <ThemedText type="defaultSemiBold" style={[styles.label, { marginTop: 12 }]}>Password</ThemedText>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Masukkan password"
              placeholderTextColor="#9AA6AA"
              autoCapitalize="none"
              returnKeyType="done"
            />

            {error !== '' && (
              <ThemedText style={styles.error}>{error}</ThemedText>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: tint }]}
              onPress={handleLogin}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Login</ThemedText>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12 }} onPress={() => router.push('/(auth)/register')}>
              <Text style={{ color: tint, textAlign: 'center' }}>Belum punya akun? Daftar</Text>
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
  inner: { flex: 1 },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '92%',
    maxWidth: 480,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  logo: { width: 96, height: 96, marginBottom: 8 },
  cardTitle: { marginTop: 6 },
  cardSubtitle: { marginBottom: 12, color: '#6D9EA8' },
  form: { width: '100%', paddingTop: 8 },
  label: { marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10,126,164,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(10,126,164,0.12)',
    color: '#11181C',
  },
  button: {
    marginTop: 18,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#c0392b', marginTop: 10 },
  overlayFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayText: { color: '#fff', marginTop: 12, fontWeight: '600' },
});
