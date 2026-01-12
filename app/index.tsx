import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getUser } from '../src/services/auth';
import { router } from 'expo-router';

export default function Index() {
  useEffect(() => {
    getUser().then(user => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
