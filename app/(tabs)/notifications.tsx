import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getData, saveData } from '../../src/services/storage';
import * as Notifications from 'expo-notifications';
import api from '../../src/services/api';
import { getUser } from '../../src/services/auth';
import { fetchRemoteTasks, fetchRemoteMessages, mergeAndSaveLocalTasks, mergeAndSaveLocalMessages, pushTaskToRemote, pushMessageToRemote } from '../../src/services/sync';

type Task = { id: string; title: string; done: boolean };
type Message = { id: string; user_nim?: string; from: string; text: string; read: boolean };
type Course = { id: string; name: string; code?: string; attendances?: string[]; notificationId?: string };

type AppContextShape = {
  tasks: Task[];
  messages: Message[];
  courses: Course[];
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  addCourse: (name: string, code?: string) => void;
  markAttendance: (courseId: string) => void;
  removeCourse: (courseId: string) => void;
  addMessage: (from: string, text: string) => void;
  addLocalMessage: (from: string, text: string, user_nim?: string) => void;
  markMessageRead: (id: string) => void;
  incompleteTasksCount: number;
  unreadMessagesCount: number;
};

const AppContext = createContext<AppContextShape | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // load persisted data on mount
  useEffect(() => {
    (async () => {
      const savedTasks = (await getData('siakad_tasks')) || [];
      const savedMessages = (await getData('siakad_messages')) || [];

      // try fetch remote and merge
      const remoteTasks = await fetchRemoteTasks();
      if (remoteTasks) {
        const merged = await mergeAndSaveLocalTasks(remoteTasks, savedTasks);
        setTasks(merged);
      } else if (savedTasks.length) {
        setTasks(savedTasks);
      } else {
        setTasks([
          { id: Date.now().toString(), title: 'Tugas Pemrograman: Buat komponen', done: false },
        ]);
      }

      const remoteMessages = await fetchRemoteMessages();
      if (remoteMessages) {
        const merged = await mergeAndSaveLocalMessages(remoteMessages, savedMessages);
        setMessages(merged);
      } else if (savedMessages.length) {
        setMessages(savedMessages);
      } else {
        setMessages([
          { id: Date.now().toString(), from: 'Pak Dosen', text: 'Reminder UTS minggu depan', read: false },
        ]);
      }

      // load courses (local only)
      const savedCourses = (await getData('siakad_courses')) || [];
      setCourses(savedCourses);
          // ensure daily summary notification is scheduled (if there are classes today)
          try { await scheduleDailySummaryNotification(); } catch (e) {}
    })();
  }, []);

  // request notification permission on mount (for local notifications)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        // ignore permission errors
      }
    })();
  }, []);

  // ensure foreground notifications are shown (Android/iOS)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  

  const refreshMessages = useCallback(async () => {
    const savedMessages = (await getData('siakad_messages')) || [];
    const remoteMessages = await fetchRemoteMessages();
    if (remoteMessages) {
      const merged = await mergeAndSaveLocalMessages(remoteMessages, savedMessages);
      setMessages(merged);
    } else if (savedMessages.length) {
      setMessages(savedMessages);
    }
  }, []);

  // poll for new messages every 8 seconds
  useEffect(() => {
    const id = setInterval(() => {
      refreshMessages().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [refreshMessages]);

  // persist when tasks/messages change
  useEffect(() => {
    saveData('siakad_tasks', tasks);
  }, [tasks]);

  useEffect(() => {
    saveData('siakad_messages', messages);
  }, [messages]);

  // reschedule summary when schedule or notif_time may change
  useEffect(() => {
    // re-run summary scheduling when courses change
    (async () => {
      try {
        await scheduleDailySummaryNotification();
      } catch (e) {}
    })();
  }, [courses]);

  const addTask = (title: string) => {
    const newTask = { id: Date.now().toString(), title, done: false };
    setTasks(prev => {
      const next = [newTask, ...prev];
      saveData('siakad_tasks', next);
      // try push to remote
      pushTaskToRemote(newTask);
      // show a foreground OS notification (web) when a task is added
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification('Tugas Baru', { body: String(newTask.title), tag: `task-${newTask.id}` });
          } catch (err) {
            // ignore per-notification failures
          }
        }
      } catch (err) {
        // ignore environments without Notification
      }
      return next;
    });
  };

  // helper: schedule repeating daily notification at 08:00 for a course
  const scheduleDailyNotificationForCourse = async (courseName: string) => {
    try {
      const now = new Date();
      // read preferred notification time (HH:MM) from storage
      let fireHour = 8;
      let fireMinute = 0;
      try {
        const pref = await getData('notif_time');
        if (pref && typeof pref === 'string') {
          const parts = pref.split(':');
          if (parts.length === 2) {
            const hh = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
              fireHour = Math.max(0, Math.min(23, hh));
              fireMinute = Math.max(0, Math.min(59, mm));
            }
          }
        }
      } catch (e) {
        // ignore and fallback to defaults
      }
      let first = new Date();
      first.setHours(fireHour, fireMinute, 0, 0);
      if (first <= now) {
        // schedule for next day
        first.setDate(first.getDate() + 1);
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Ingat Presensi', body: `Belum presensi: ${courseName}` },
        trigger: { hour: fireHour, minute: fireMinute, repeats: true },
      });
      return id;
    } catch (e) {
      return null;
    }
  };

  // helper: schedule a daily summary notification listing today's classes (if any)
  const scheduleDailySummaryNotification = async () => {
    try {
      // cancel previous summary if any
      try {
        const prevId = await getData('notif_summary_id');
        if (prevId) await Notifications.cancelScheduledNotificationAsync(prevId);
      } catch (e) {}

      const schedule = (await getData('siakad_schedule')) || {};
      const now = new Date();
      const wd = now.getDay();
      const dayIndex = (wd >= 1 && wd <= 5) ? wd : 1; // 1..5
      const todays: any[] = (schedule && schedule[dayIndex]) || [];
      if (!todays || todays.length === 0) {
        // nothing to schedule
        await saveData('notif_summary_id', null);
        return null;
      }

      // build message body
      const list = todays.map((s: any) => s.mk || s.name || s.course || 'Mata Kuliah').slice(0, 5);
      const body = `Anda ada ${todays.length} perkuliahan hari ini: ${list.join(', ')}`;

      // read preferred time
      let fireHour = 8;
      let fireMinute = 0;
      try {
        const pref = await getData('notif_time');
        if (pref && typeof pref === 'string') {
          const parts = pref.split(':');
          if (parts.length === 2) {
            const hh = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
              fireHour = Math.max(0, Math.min(23, hh));
              fireMinute = Math.max(0, Math.min(59, mm));
            }
          }
        }
      } catch (e) {}

      // schedule
      const first = new Date();
      first.setHours(fireHour, fireMinute, 0, 0);
      if (first <= new Date()) first.setDate(first.getDate() + 1);
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Jadwal Hari Ini', body },
        trigger: { hour: fireHour, minute: fireMinute, repeats: true },
      });
      await saveData('notif_summary_id', id);
      return id;
    } catch (e) {
      return null;
    }
  };

  const addCourse = async (name: string, code?: string) => {
    const newCourse: Course = { id: Date.now().toString(), name, code: code || '', attendances: [] };
    // schedule notification
    const notifId = await scheduleDailyNotificationForCourse(name);
    if (notifId) newCourse.notificationId = notifId;
    setCourses(prev => {
      const next = [newCourse, ...prev];
      saveData('siakad_courses', next);
      return next;
    });
  };

  const markAttendance = async (courseId: string) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayKey = `${y}-${m}-${d}`;

    // get current user nim (per-user attendance)
    let nim = 'local';
    try {
      const u = await getUser();
      nim = u?.nim || nim;
    } catch (e) {}

    const entry = `${todayKey}|${nim}`;

    // first update attendances synchronously (store entries as date|nim)
    setCourses(prev => {
      const next = prev.map(c => {
        if (c.id !== courseId) return c;
        const attendances = Array.isArray(c.attendances) ? [...c.attendances] : [];
        if (!attendances.includes(entry)) attendances.push(entry);
        return { ...c, attendances };
      });
      saveData('siakad_courses', next);
      return next;
    });

    // then perform async side-effects: cancel today's scheduled notif and schedule for next day
    try {
      const saved = (await getData('siakad_courses')) || [];
      const course = (saved || []).find((x: any) => x.id === courseId);
      if (course) {
        try {
          if (course.notificationId) await Notifications.cancelScheduledNotificationAsync(course.notificationId);
        } catch (e) {}
        try {
          const newId = await scheduleDailyNotificationForCourse(course.name);
          if (newId) {
            setCourses(prev => {
              const updated = prev.map(c => (c.id === courseId ? { ...c, notificationId: newId } : c));
              saveData('siakad_courses', updated);
              return updated;
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  };

  const removeCourse = async (courseId: string) => {
    try {
      const savedCourses = (await getData('siakad_courses')) || [];
      const found = (savedCourses || []).find((c: any) => c.id === courseId);
      if (found && found.notificationId) {
        try { await Notifications.cancelScheduledNotificationAsync(found.notificationId); } catch (e) {}
      }
      const next = (savedCourses || []).filter((c: any) => c.id !== courseId);
      await saveData('siakad_courses', next);
      // reflect in state
      setCourses(next);
    } catch (e) {
      // best-effort fallback: remove from current state
      setCourses(prev => {
        const found = prev.find(c => c.id === courseId);
        if (found && found.notificationId) {
          try { Notifications.cancelScheduledNotificationAsync(found.notificationId); } catch (er) {}
        }
        const next = prev.filter(c => c.id !== courseId);
        try { saveData('siakad_courses', next); } catch (er) {}
        return next;
      });
    }
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveData('siakad_tasks', next);
      // best effort: try delete on remote if numeric id
      if (/^\d+$/.test(String(id))) {
        api.delete(`/tasks/${id}`).catch(() => {});
      }
      return next;
    });
  };

  const addMessage = (from: string, text: string) => {
    const newMsg = { id: Date.now().toString(), from, text, read: false };
    setMessages(prev => {
      const next = [newMsg, ...prev];
      saveData('siakad_messages', next);
      pushMessageToRemote(newMsg);
      return next;
    });
  };

  // when a local notification is received (foreground or scheduled), mirror it into messages
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notification => {
      try {
        const title = String(notification.request.content.title || '');
        const body = String(notification.request.content.body || '');
        // if this looks like a presensi reminder, add a local message so it appears in Pesan
        if (body.toLowerCase().includes('presensi') || title.toLowerCase().includes('presensi')) {
          addMessage('Sistem', body || title);
        }
      } catch (e) {
        // ignore
      }
    });
    return () => {
      try { Notifications.removeNotificationSubscription(sub); } catch (e) {}
    };
  }, [addMessage]);

  const addLocalMessage = (from: string, text: string, user_nim?: string) => {
    const newMsg: Message = { id: Date.now().toString(), from, text, read: false };
    if (user_nim) newMsg.user_nim = user_nim;
    setMessages(prev => {
      const next = [newMsg, ...prev];
      saveData('siakad_messages', next);
      return next;
    });
  };

  const markMessageRead = (id: string) => {
    setMessages(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, read: true } : m));
      saveData('siakad_messages', next);
      // try update remote if numeric id
      if (/^\d+$/.test(String(id))) {
        api.put(`/messages/${id}`, { read: true }).catch(() => {});
      }
      return next;
    });
  };

  const incompleteTasksCount = tasks.filter(t => !t.done).length;
  const unreadMessagesCount = messages.filter(m => !m.read).length;

  return (
    <AppContext.Provider
      value={{
        tasks,
        messages,
        courses,
        addTask,
        addCourse,
        markAttendance,
        removeCourse,
        toggleTask,
        deleteTask,
        addMessage,
          addLocalMessage,
        markMessageRead,
        incompleteTasksCount,
        unreadMessagesCount,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
