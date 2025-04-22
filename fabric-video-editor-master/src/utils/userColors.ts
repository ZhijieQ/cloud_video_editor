// User avatar color util

// Available color list
export const USER_COLORS = [
  {
    bg: 'bg-red-500',
    border: 'border-red-500',
    text: 'text-red-500'
  },
  {
    bg: 'bg-blue-500',
    border: 'border-blue-500',
    text: 'text-blue-500'
  },
  {
    bg: 'bg-green-500',
    border: 'border-green-500',
    text: 'text-green-500'
  },
  {
    bg: 'bg-yellow-500',
    border: 'border-yellow-500',
    text: 'text-yellow-500'
  }
];

// get color by user id
export const getUserColor = (userId: string) => {
  const colorIndex = userId.charCodeAt(0) % USER_COLORS.length;
  return USER_COLORS[colorIndex];
};

// get user background color by id
export const getUserBgColor = (userId: string) => {
  return getUserColor(userId).bg;
};

// get user border color by id
export const getUserBorderColor = (userId: string) => {
  return getUserColor(userId).border;
};

// get User text color by id
export const getUserTextColor = (userId: string) => {
  return getUserColor(userId).text;
};
