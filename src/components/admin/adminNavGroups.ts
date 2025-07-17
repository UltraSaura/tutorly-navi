
import { Settings, Book, Users, Layout } from "lucide-react";

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
      {
        title: 'Sidebar Tabs',
        path: '/admin/sidebar-tabs',
        iconName: 'Layout',
      },
    ],
  }
];

export const iconMap = {
  Settings,
  Book,
  Users,
  Layout
};
