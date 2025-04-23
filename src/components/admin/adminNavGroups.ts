
import { Settings, Book, Users } from "lucide-react";

export const adminNavGroups = [
  {
    label: 'Admin Features',
    items: [
      {
        title: 'AI Model Management',
        path: '/admin/models',
        icon: <Settings className="mr-2 h-5 w-5" />,
      },
      {
        title: 'Subject Management',
        path: '/admin/subjects',
        icon: <Book className="mr-2 h-5 w-5" />,
      },
      {
        title: 'User Management',
        path: '/admin/users',
        icon: <Users className="mr-2 h-5 w-5" />,
      },
    ],
  }
];
