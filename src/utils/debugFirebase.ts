import { ref, onValue, set, DatabaseReference } from 'firebase/database';
import { database } from './firebaseConfig';

// 测试 Firebase 连接
export const testFirebaseConnection = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const testRef = ref(database, '.info/connected');
    
    const unsubscribe = onValue(testRef, (snapshot) => {
      unsubscribe(); // 只检查一次
      const connected = snapshot.val() === true;
      console.log('Firebase 连接状态:', connected ? '已连接' : '未连接');
      resolve(connected);
    });
    
    // 5秒超时
    setTimeout(() => {
      unsubscribe();
      console.log('Firebase 连接检查超时');
      resolve(false);
    }, 5000);
  });
};

// 测试写入权限
export const testFirebaseWrite = (projectId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const testRef = ref(database, `chats/${projectId}/test`);
    
    set(testRef, {
      timestamp: Date.now(),
      test: true
    })
    .then(() => {
      console.log('Firebase 写入测试成功');
      // 清理测试数据
      set(testRef, null);
      resolve(true);
    })
    .catch((error) => {
      console.error('Firebase 写入测试失败:', error);
      resolve(false);
    });
  });
};

// 检查数据库路径是否存在
export const checkPathExists = (path: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const pathRef = ref(database, path);
    
    const unsubscribe = onValue(pathRef, (snapshot) => {
      unsubscribe(); // 只检查一次
      const exists = snapshot.exists();
      console.log(`路径 ${path} ${exists ? '存在' : '不存在'}`);
      resolve(exists);
    }, (error) => {
      console.error(`检查路径 ${path} 时出错:`, error);
      resolve(false);
    });
  });
};
