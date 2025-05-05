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

export const getProjectUsersRef = (projectId: string): DatabaseReference => {
  return ref(database, `projects/${projectId}/userPresence`);
};

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

  set(userStatusRef, {
    ...userData,
    lastActive: serverTimestamp(),
    online: true
  });

  onDisconnect(userStatusRef).remove();
  //TODO:

  return () => {
    set(userStatusRef, null);
  };
};

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

    const users = Object.entries(data)
      .filter(([uid]) => uid !== currentUserId)
      .map(([uid, userData]: [string, any]) => ({
        uid,
        ...userData,
        isActive: userData.lastActive > Date.now() - 5 * 60 * 1000
      }))
      .filter(user => user.isActive);

    callback(users);
  };

  onValue(usersRef, handleUsers);

  return () => off(usersRef, 'value', handleUsers);
};
