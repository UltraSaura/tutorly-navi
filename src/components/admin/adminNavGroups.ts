
import { Settings, Book, Users } from "lucide-react";

export const adminNavGroups = [
  {
    label: 'Admin Features',
    items: [
      {
        title: 'AI Model Management',
        path: '/admin/models',
        iconName: 'Settings',
      },
      {
        title: 'Subject Management',
        path: '/admin/subjects',
        iconName: 'Book',
      },
      {
        title: 'User Management',
        path: '/admin/users',
        iconName: 'Users',
      },
    ],
  }
];

export const iconMap = {
  Settings,
  Book,
  Users
};
