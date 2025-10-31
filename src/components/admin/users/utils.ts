
import { User } from '@/types/admin';

// Helper function to generate name from email if first/last name isn't available
export const generateNameFromEmail = (email: string): string => {
  const parts = email.split('@')[0].split('.');
  const formattedParts = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  );
  return formattedParts.join(' ');
};

// Calculate average minutes per day for activity
export const averageMinutes = (user: User) => {
  const total = user.activity?.reduce((acc, day) => acc + day.minutes, 0) || 0;
  return Math.round(total / (user.activity?.length || 1));
};

// Calculate total minutes for activity
export const totalMinutes = (user: User) => {
  return user.activity?.reduce((acc, day) => acc + day.minutes, 0) || 0;
};
