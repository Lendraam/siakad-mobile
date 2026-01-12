import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text, useWindowDimensions, Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useApp } from '@/services/notifications';

function IconWithDot({ name, color, size, showDot }: { name: any; color: string; size: number; showDot?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <IconSymbol size={size} name={name} color={color} />
      {showDot ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            top: -2,
            width: 8,
            height: 8,
            borderRadius: 8,
            backgroundColor: '#FF3B30',
          }}
        />
      ) : null}
    </View>
  );
}

function InnerTabs() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const hideTabBar = typeof pathname === 'string' && (pathname.includes('/khs') || pathname.includes('/krs'));
  const { incompleteTasksCount, unreadMessagesCount } = useApp();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <IconWithDot name="house.fill" color={color} size={28} showDot={false} />
          ),
        }}
      />

      <Tabs.Screen
        name="jadwal"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ color }) => <IconWithDot name="calendar" color={color} size={28} />,
        }}
      />

      <Tabs.Screen
        name="tugas"
        options={{
          title: 'Tugas',
          tabBarIcon: ({ color }) => (
            <IconWithDot name="checklist" color={color} size={28} showDot={incompleteTasksCount > 0} />
          ),
        }}
      />

      <Tabs.Screen
        name="pesan"
        options={{
          title: 'Pesan',
          tabBarIcon: ({ color }) => (
            <IconWithDot name="message" color={color} size={28} showDot={unreadMessagesCount > 0} />
          ),
        }}
      />

      <Tabs.Screen
        name="presensi"
        options={{
          title: 'Presensi',
          tabBarIcon: ({ color }) => <IconWithDot name="checkmark.seal" color={color} size={28} />,
        }}
      />

      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <IconWithDot name="person" color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 600;

  return (
    <AppProvider>
      {isMobile ? <MobileWithHeader /> : <DesktopWithTopNav />}
    </AppProvider>
  );
}

function MobileWithHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [open, setOpen] = useState(false);

  const titleMap: Record<string, string> = {
    '/index': 'index',
    '/jadwal': 'Jadwal',
    '/tugas': 'Tugas',
    '/pesan': 'Pesan',
    '/profil': 'Profil',
  };

  const title = Object.keys(titleMap).find(k => pathname?.startsWith(k));

  return (
    <View style={{ flex: 1 }}>

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: '#eee', borderBottomWidth: 1 }]}> 
        <TouchableOpacity onPress={() => setOpen(true)} style={styles.menuBtn}>
          <IconSymbol name="chevron.right" size={28} color={colors.tint} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title ? titleMap[title] : 'Mini SIAKAD'}</Text>
      </View>

      <TopNav />

      <InnerTabs />

      <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)} />
        <View style={[styles.drawer, { backgroundColor: colors.background }]}> 
          <TouchableOpacity onPress={() => { setOpen(false); router.push('/index' as any); }} style={styles.drawerItem}><Text style={{ color: colors.text }}>Beranda</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setOpen(false); router.push('/jadwal' as any); }} style={styles.drawerItem}><Text style={{ color: colors.text }}>Jadwal</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setOpen(false); router.push('/tugas' as any); }} style={styles.drawerItem}><Text style={{ color: colors.text }}>Tugas</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setOpen(false); router.push('/pesan' as any); }} style={styles.drawerItem}><Text style={{ color: colors.text }}>Pesan</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setOpen(false); router.push('/profil' as any); }} style={styles.drawerItem}><Text style={{ color: colors.text }}>Profil</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

function DesktopWithTopNav() {
  return (
    <View style={{ flex: 1 }}>
      <TopNav />
      <InnerTabs />
    </View>
  );
}

function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { incompleteTasksCount, unreadMessagesCount } = useApp();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const items = [
  {
    name: 'Beranda',
    path: '/',
    icon: 'house.fill',
  },
    { name: 'Jadwal', path: '/(tabs)/jadwal', icon: 'calendar' },
    { name: 'Tugas', path: '/(tabs)/tugas', icon: 'checklist', badge: incompleteTasksCount },
    { name: 'Presensi', path: '/(tabs)/presensi', icon: 'checkmark.seal' },
    { name: 'Pesan', path: '/(tabs)/pesan', icon: 'message', badge: unreadMessagesCount },
    { name: 'Profil', path: '/(tabs)/profil', icon: 'person' },
  ];

  return (
    <View style={[topStyles.container, { backgroundColor: colors.background, borderBottomColor: '#eee', borderBottomWidth: 1 }]}> 
      {items.map(i => {
        const active = pathname?.startsWith(i.path);
        return (
          <TouchableOpacity key={i.path} onPress={() => router.push(i.path as any)} style={topStyles.item}>
            <IconWithDot name={i.icon as any} color={active ? colors.tint : colors.icon} size={22} showDot={!!(i.badge && i.badge > 0)} />
            <Text style={[topStyles.label, { color: active ? colors.tint : colors.text }]}>{i.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  menuBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', marginLeft: 8 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 260, paddingTop: 56, paddingHorizontal: 12 },
  drawerItem: { paddingVertical: 12 },
});

const topStyles = StyleSheet.create({
  container: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, marginTop: 2 },
});
