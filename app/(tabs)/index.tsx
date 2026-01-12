import { View, Text, Button, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { logout, getUser } from '../../src/services/auth';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { getData, saveData } from '../../src/services/storage';
import { useApp } from '@/services/notifications';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

type User = {
  id: number;
  nim: string;
  name: string;
  email: string | null;
};

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const headerBg = String(colorScheme) === 'dark' ? colors.card : colors.tint;
  const { incompleteTasksCount, unreadMessagesCount } = useApp();
  const [storageSummary, setStorageSummary] = useState<any>({});
  const [prefTheme, setPrefTheme] = useState<string | null>(null);

  useEffect(() => {
    getUser().then(setUser);
    (async () => {
      const tasks = await getData('siakad_tasks');
      const msgs = await getData('siakad_messages');
      const u = await getData('user');
      const pref = await getData('pref_theme');
      setStorageSummary({ tasks, msgs, user: u });
      setPrefTheme(pref ?? null);
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const togglePrefTheme = async () => {
    const next = prefTheme === 'dark' ? 'light' : prefTheme === 'light' ? null : 'dark';
    await saveData('pref_theme', next);
    setPrefTheme(next);
  };

  const todaySchedule = [
    { id: 1, course: 'Pemrograman Mobile', time: '08:00 - 10:00', room: 'Lab 301' },
    { id: 2, course: 'Basis Data', time: '13:00 - 15:00', room: 'Lab 302' },
  ];

  const quickActions = [
    { icon: 'add-circle', label: 'Tugas Baru', onPress: () => router.push('/(tabs)/tugas' as any) },
    { icon: 'calendar', label: 'Jadwal', onPress: () => router.push('/(tabs)/jadwal' as any) },
    { icon: 'camera', label: 'Foto', onPress: () => router.push('/(tabs)/profil' as any) },
    { icon: 'notifications', label: 'Notifikasi', onPress: () => console.log('Notifikasi') },
    { icon: 'school', label: 'KHS', onPress: () => router.push('/(tabs)/khs' as any) },
    { icon: 'settings', label: 'Pengaturan', onPress: () => router.push('/(tabs)/profil' as any) },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={[styles.profileImageWrap, { backgroundColor: String(colorScheme) === 'dark' ? colors.card : 'transparent' }]}> 
              <Image 
                source={require('../../assets/images/avatar-default.png')} 
                style={[styles.profileImage, { borderColor: String(colorScheme) === 'dark' ? colors.background : '#fff' }]} 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.greeting}>Selamat Datang</Text>
              <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{user?.name || 'Mahasiswa'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {user?.type ? (
                  <View style={[styles.userTypeBadge, { backgroundColor: String(colorScheme) === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <Text style={styles.userTypeText}>{user.type === 'non-reguler' ? 'Non-Reguler' : 'Reguler'}</Text>
                  </View>
                ) : null}
                <Text style={styles.userNim}>{user?.nim || 'NIM'}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications" size={24} color="#fff" />
            {unreadMessagesCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistik Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="assignment" size={28} color="#fff" />
            <Text style={styles.statNumber}>{incompleteTasksCount}</Text>
            <Text style={styles.statLabel}>Tugas</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#2196F3' }]}>
            <MaterialIcons name="message" size={28} color="#fff" />
            <Text style={styles.statNumber}>{unreadMessagesCount}</Text>
            <Text style={styles.statLabel}>Pesan</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#FF9800' }]}>
            <FontAwesome5 name="user-check" size={24} color="#fff" />
            <Text style={styles.statNumber}>2/3</Text>
            <Text style={styles.statLabel}>Presensi</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#9C27B0' }]}>
            <MaterialIcons name="school" size={28} color="#fff" />
            <Text style={styles.statNumber}>3.75</Text>
            <Text style={styles.statLabel}>IPK</Text>
          </View>
        </View>
      </View>

      {/* Jadwal Hari Ini */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Jadwal Hari Ini</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/jadwal' as any)}>
            <Text style={[styles.seeAll, { color: colors.tint }]}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        
        {todaySchedule.map((item) => (
          <View key={item.id} style={styles.scheduleItem}>
            <View style={styles.scheduleTime}>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <View style={styles.scheduleInfo}>
              <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.course}</Text>
              <Text style={[styles.roomText, { color: colors.secondaryText }]}>📍 {item.room}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tugas Terdekat */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tugas Deadline</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tugas' as any)}>
            <Text style={[styles.seeAll, { color: colors.tint }]}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>
        
        {Array.isArray(storageSummary.tasks) && storageSummary.tasks.slice(0, 3).map((task: any, index: number) => (
          <View key={index} style={styles.taskItem}>
            <View style={[styles.taskDot, { backgroundColor: task?.completed ? '#4CAF50' : '#FF9800' }]} />
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                {task?.title || `Tugas ${index + 1}`}
              </Text>
              <Text style={[styles.taskDate, { color: colors.secondaryText }]}>
                {task?.deadline || 'Deadline: Besok'}
              </Text>
            </View>
          </View>
        ))}
        
        {(!storageSummary.tasks || storageSummary.tasks.length === 0) && (
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
            Tidak ada tugas
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.actionButton}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.tint + '20' }]}>
                <Ionicons name={action.icon as any} size={24} color={colors.tint} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Status & Theme */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            Tema: {prefTheme || 'Sistem'}
          </Text>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: String(colorScheme) === 'dark' ? 'rgba(255,255,255,0.06)' : colors.tint }]}
            onPress={togglePrefTheme}
          >
            <Text style={[styles.themeButtonText, { color: String(colorScheme) === 'dark' ? colors.tint : '#fff' }]}>Ganti Tema</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            Status: {storageSummary.user ? 'Terhubung' : 'Offline'}
          </Text>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileImageDark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileInfo: {
    marginLeft: 15,
    flexShrink: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
  userNim: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  userTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationIcon: {
    padding: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 20,
    marginTop: -10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  statCard: {
    flexBasis: '48%',
    height: 100,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  scheduleTime: {
    width: 80,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    marginRight: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    textAlign: 'center',
  },
  scheduleInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  roomText: {
    fontSize: 14,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
  },
  taskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  taskDate: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  actionButton: {
    flexBasis: '30%',
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statusText: {
    fontSize: 14,
  },
  themeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  themeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
});
