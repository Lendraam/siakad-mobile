import axios from 'axios';
import { Platform } from 'react-native';

// Determine backend host for different platforms:
// - Web / local desktop: 127.0.0.1
// - Android emulator (default): 10.0.2.2
// - Real devices: set REACT_NATIVE_API_HOST env or replace below with your machine IP (e.g. 192.168.x.y)
const DEFAULT_HOST = '127.0.0.1';
let host = DEFAULT_HOST;

if (Platform.OS === 'android') {
  // Android emulator maps host machine's localhost to 10.0.2.2
  host = process.env.EXPO_LOCAL_HOST || '10.0.2.2';
}

const baseURL = `http://${host}:8000/api`;

const api = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export default api;
