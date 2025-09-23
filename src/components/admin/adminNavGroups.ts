
import { Settings, Book, Users, Wifi } from "lucide-react";

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
        title: 'Connection Diagnostics',
        path: '/admin/diagnostics',
        iconName: 'Wifi',
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
      {
        title: 'System Prompts',
        path: '/admin/prompts',
        iconName: 'Settings',
      },
    ],
  }
];

export const iconMap = {
  Settings,
  Book,
  Users,
  Wifi
};
