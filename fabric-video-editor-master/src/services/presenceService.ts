import {
  ref,
  onValue,
  off,
  set,
  onDisconnect,
  serverTimestamp,
  DatabaseReference
} from 'firebase/database';
import { database } from '@/utils/firebaseConfig';

// 获取项目在线用户引用
export const getProjectUsersRef = (projectId: string): DatabaseReference => {
  return ref(database, `projects/${projectId}/userPresence`);
};

// 设置用户在线状态
export const setUserOnlineStatus = (
  projectId: string,
  userId: string,
  userData: {
    displayName: string;
    photoURL?: string | null;
    [key: string]: any;
  }
): () => void => {
  const userStatusRef = ref(database, `projects/${projectId}/userPresence/${userId}`);

  // 设置用户数据
  set(userStatusRef, {
    ...userData,
    lastActive: serverTimestamp(),
    online: true
  });

  // 设置离线时自动清除
  onDisconnect(userStatusRef).remove();

  // 返回清理函数
  return () => {
    set(userStatusRef, null);
  };
};

// 监听在线用户
export const subscribeToOnlineUsers = (
  projectId: string,
  currentUserId: string,
  callback: (users: any[]) => void
): () => void => {
  const usersRef = getProjectUsersRef(projectId);

  const handleUsers = (snapshot: any) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }

    // 过滤掉当前用户和不活跃的用户
    const users = Object.entries(data)
      .filter(([uid]) => uid !== currentUserId)
      .map(([uid, userData]: [string, any]) => ({
        uid,
        ...userData,
        // 如果最后活跃时间超过5分钟，认为不在线
        isActive: userData.lastActive > Date.now() - 5 * 60 * 1000
      }))
      .filter(user => user.isActive);

    callback(users);
  };

  onValue(usersRef, handleUsers);

  // 返回取消订阅函数
  return () => off(usersRef, 'value', handleUsers);
};
