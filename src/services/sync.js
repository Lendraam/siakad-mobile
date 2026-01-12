import api from './api';
import { getData, saveData } from './storage';
import { getUser } from './auth';

export async function fetchRemoteTasks() {
  const user = await getUser();
  if (!user) return null;
  try {
    const res = await api.get('/tasks', { params: { nim: user.nim } });
    return res.data;
  } catch (e) {
    console.log('fetchRemoteTasks error', e.message);
    return null;
  }
}

export async function fetchRemoteMessages() {
  const user = await getUser();
  if (!user) return null;
  try {
    const res = await api.get('/messages', { params: { nim: user.nim } });
    return res.data;
  } catch (e) {
    console.log('fetchRemoteMessages error', e.message);
    return null;
  }
}

export async function pushTaskToRemote(task) {
  const user = await getUser();
  if (!user) return null;
  try {
    const payload = { user_nim: user.nim, title: task.title, done: task.done };
    if (task.id && String(task.id).length < 13) {
      // assume numeric id from server
      const res = await api.put(`/tasks/${task.id}`, payload);
      return res.data;
    } else {
      const res = await api.post('/tasks', payload);
      return res.data;
    }
  } catch (e) {
    console.log('pushTaskToRemote error', e.message);
    return null;
  }
}

export async function pushMessageToRemote(msg) {
  const user = await getUser();
  if (!user) return null;
  try {
    const payload = { user_nim: user.nim, from: msg.from, text: msg.text, read: !!msg.read };
    if (msg.id && String(msg.id).length < 13) {
      const res = await api.put(`/messages/${msg.id}`, payload);
      return res.data;
    } else {
      const res = await api.post('/messages', payload);
      return res.data;
    }
  } catch (e) {
    console.log('pushMessageToRemote error', e.message);
    return null;
  }
}

export async function mergeAndSaveLocalTasks(remote, local) {
  // Prefer server items (by numeric id), then local ones
  const merged = [...(remote || []), ...(local || []).filter(l => !(remote || []).some(r => String(r.id) === String(l.id)))];
  await saveData('siakad_tasks', merged);
  return merged;
}

export async function mergeAndSaveLocalMessages(remote, local) {
  const merged = [...(remote || []), ...(local || []).filter(l => !(remote || []).some(r => String(r.id) === String(l.id)))];
  await saveData('siakad_messages', merged);
  return merged;
}
