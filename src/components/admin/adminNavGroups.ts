
import { Settings, Book, Users, Wifi, GraduationCap, BookOpen, History, SlidersHorizontal, FileText } from "lucide-react";
import type { AdminPermission } from '@/lib/admin/permissions';

export const adminNavGroups = [
  {
    label: 'Admin Features',
    items: [
      {
        title: 'AI Model Management',
        path: '/admin/models',
        iconName: 'Settings',
        permission: 'ai.manage' as AdminPermission,
      },
      {
        title: 'Connection Diagnostics',
        path: '/admin/diagnostics',
        iconName: 'Wifi',
        permission: 'system.manage' as AdminPermission,
      },
      {
        title: 'Subject Management',
        path: '/admin/subjects',
        iconName: 'Book',
        permission: 'subjects.read' as AdminPermission,
      },
      {
        title: 'User Management',
        path: '/admin/users',
        iconName: 'Users',
        permission: 'users.manage' as AdminPermission,
      },
      {
        title: 'System Prompts',
        path: '/admin/prompts',
        iconName: 'Settings',
        permission: 'prompts.manage' as AdminPermission,
      },
      {
        title: 'Learning Content',
        path: '/admin/learning',
        iconName: 'GraduationCap',
        permission: 'content.read' as AdminPermission,
      },
      {
        title: 'Curriculum Manager',
        path: '/admin/curriculum',
        iconName: 'BookOpen',
        permission: 'curriculum.read' as AdminPermission,
      },
      {
        title: 'Annales',
        path: '/admin/exams',
        iconName: 'FileText',
        permission: 'annales.read' as AdminPermission,
      },
      {
        title: 'Recent Updates',
        path: '/admin/recent-updates',
        iconName: 'History',
        permission: 'system.manage' as AdminPermission,
      },
      {
        title: 'Settings',
        path: '/admin/settings',
        iconName: 'SlidersHorizontal',
        permission: 'system.manage' as AdminPermission,
      },
    ],
  }
];

export const iconMap = {
  Settings,
  Book,
  Users,
  Wifi,
  GraduationCap,
  BookOpen,
  History,
  SlidersHorizontal,
  FileText,
};
