import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    // notify listeners when preference theme changes
    if (key === 'pref_theme' && typeof value !== 'undefined') {
      try {
        exports._notifyPrefTheme && exports._notifyPrefTheme(value);
      } catch (e) {
        // ignore
      }
    }
    // notify listeners when user data changes
    if (key === 'user') {
      try {
        exports._notifyUser && exports._notifyUser(value);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    console.log('Error save data', e);
  }
};

export const getData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.log('Error get data', e);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.log('Error remove data', e);
  }
};

// minimal pub/sub for pref_theme changes
export const onPrefThemeChange = (cb) => {
  if (!exports._prefThemeListeners) exports._prefThemeListeners = new Set();
  exports._prefThemeListeners.add(cb);
  // ensure notifier is wired
  exports._notifyPrefTheme = (v) => {
    for (const fn of exports._prefThemeListeners) {
      try { fn(v); } catch (e) { /* ignore */ }
    }
  };
  return () => {
    exports._prefThemeListeners.delete(cb);
  };
};

// pub/sub for user changes
export const onUserChange = (cb) => {
  if (!exports._userListeners) exports._userListeners = new Set();
  exports._userListeners.add(cb);
  exports._notifyUser = (v) => {
    for (const fn of exports._userListeners) {
      try { fn(v); } catch (e) { /* ignore */ }
    }
  };
  return () => exports._userListeners.delete(cb);
};
