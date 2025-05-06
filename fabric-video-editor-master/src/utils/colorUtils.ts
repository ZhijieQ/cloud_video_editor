// Color utility functions

// Define a type for the color mapping
type ColorMap = {
  [key: string]: string;
};

// Map Tailwind color classes to actual color values
const TAILWIND_COLORS: ColorMap = {
  'bg-red-500': '#ef4444',
  'bg-blue-500': '#3b82f6',
  'bg-green-500': '#22c55e',
  'bg-yellow-500': '#eab308'
};

// Convert Tailwind bg class to actual color value
export const getTailwindColorValue = (bgClass: string): string => {
  return TAILWIND_COLORS[bgClass] || '#ffffff';
};
