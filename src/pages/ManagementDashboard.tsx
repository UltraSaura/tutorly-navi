import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Settings, Users, BarChart3, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const ManagementDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Management Dashboard</h1>
            <p className="text-muted-foreground mt-2">System administration and control panel</p>
          </div>
          <Link to="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          </Link>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Admin Panel Access */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin Panel
              </CardTitle>
              <CardDescription>
                Access the administrative interface for system management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin">
                <Button className="w-full">
                  Open Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin/users">
                <Button variant="outline" className="w-full">
                  Manage Users
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure AI models, subjects, and system parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/admin/models">
                <Button variant="outline" className="w-full">
                  System Config
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Analytics Overview */}
          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                System Overview
              </CardTitle>
              <CardDescription>
                Quick system status and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">Active</div>
                  <div className="text-sm text-muted-foreground">System Status</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">--</div>
                  <div className="text-sm text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">--</div>
                  <div className="text-sm text-muted-foreground">Daily Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/subjects">
              <Button variant="outline" size="sm">
                Manage Subjects
              </Button>
            </Link>
            <Link to="/admin/models">
              <Button variant="outline" size="sm">
                AI Models
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline" size="sm">
                User Accounts
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementDashboard;