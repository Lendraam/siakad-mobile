import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const login = async (nim, password) => {
  try {
    const res = await api.post('/login', { nim, password });
    if (res && res.data && res.data.user) {
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error('Login gagal');
  } catch (e) {
    // normalize error
    const msg = e?.response?.data?.message || e.message || 'Login error';
    throw new Error(msg);
  }
};

export const register = async (nim, name, password, email = null, regType = 'reguler') => {
  try {
    const payload = { nim, name, email, password, type: regType };
    const res = await api.post('/register', payload);
    if (res && res.data && res.data.user) {
      // ensure type is present locally even if backend didn't include it
      const user = { ...res.data.user, type: res.data.user.type || regType };
      await AsyncStorage.setItem('user', JSON.stringify(user));
      return user;
    }
    throw new Error(res?.data?.message || 'Register failed');
  } catch (e) {
    const msg = e?.response?.data?.message || e.message || 'Register error';
    throw new Error(msg);
  }
};

export const getUser = async () => {
  const data = await AsyncStorage.getItem('user');
  return data ? JSON.parse(data) : null;
};

export const logout = async () => {
  await AsyncStorage.removeItem('user');
};
