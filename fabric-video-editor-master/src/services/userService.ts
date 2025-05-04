import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection
} from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface UserInfo {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  lastActive?: number;
}

const userCache: Record<string, UserInfo> = {};

export const saveUserInfo = async (user: User): Promise<void> => {
  if (!user) return;

  const db = getFirestore();
  const userRef = doc(db, 'users', user.uid);

  const userInfo: UserInfo = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    email: user.email,
    photoURL: user.photoURL,
    lastActive: Date.now()
  };

  userCache[user.uid] = userInfo;

  try {
    await setDoc(userRef, userInfo, { merge: true });
  } catch (error) {
    console.error('Error saving user info:', error);
  }
};

export const getUserInfo = async (userId: string): Promise<UserInfo | null> => {
  if (userCache[userId]) {
    return userCache[userId];
  }

  const db = getFirestore();
  const userRef = doc(db, 'users', userId);

  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserInfo;
      userCache[userId] = userData;
      return userData;
    }
  } catch (error) {
    console.error('Error getting user info:', error);
  }

  return null;
};

export const getUsersInfo = async (userIds: string[]): Promise<Record<string, UserInfo>> => {
  const result: Record<string, UserInfo> = {};

  const idsToFetch = userIds.filter(id => !userCache[id]);

  // 对于缓存中已有的用户，直接添加到结果中
  userIds.forEach(id => {
    if (userCache[id]) {
      result[id] = userCache[id];
    }
  });

  if (idsToFetch.length === 0) {
    return result;
  }

  const db = getFirestore();
  const fetchPromises = idsToFetch.map(async (id) => {
    try {
      const userRef = doc(db, 'users', id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserInfo;
        userCache[id] = userData;
        result[id] = userData;
      }
    } catch (error) {
      console.error(`Error getting user info for ${id}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  return result;
};
