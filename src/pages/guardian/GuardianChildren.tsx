import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, GraduationCap, Calendar, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ChildWithUser } from '@/types/guardian';
import AddChildForm from '@/components/guardian/AddChildForm';
import { ChildRegistrationData } from '@/types/registration';
import { ManualChildCreationTrigger } from '@/components/guardian/ManualChildCreationTrigger';

export default function GuardianChildren() {
  const navigate = useNavigate();
  const { guardianId, guardianCountry } = useGuardianAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [relation, setRelation] = useState('parent');

  // Fetch children
  const { data: children, isLoading } = useQuery({
    queryKey: ['guardian-children', guardianId],
    queryFn: async () => {
      if (!guardianId) return null;
      
      const { data, error } = await supabase
        .from('guardian_child_links')
        .select(`
          id,
          relation,
          child_id,
          children!inner(
            id,
            user_id,
            grade,
            curriculum,
            status,
            settings_json,
            users!inner(
              id,
              first_name,
              last_name,
              username,
              email
            )
          )
        `)
        .eq('guardian_id', guardianId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!guardianId,
  });

  // Add child mutation
  const addChildMutation = useMutation({
    mutationFn: async (data: ChildRegistrationData & { relation: string }) => {
      if (!guardianId) throw new Error('Guardian ID not found');

      const { data: result, error } = await supabase.functions.invoke('create-child-account', {
        body: {
          username: data.username,
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          phoneNumber: data.phoneNumber,
          schoolLevel: data.schoolLevel,
          relation: data.relation,
        },
      });

      if (error) throw error;
      if (!result.success) throw new Error(result.error || 'Failed to create child account');

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardian-children'] });
      setIsAddDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Child account created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddChild = (formData: ChildRegistrationData) => {
    addChildMutation.mutate({ ...formData, relation });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading children...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Check for pending children and show manual trigger */}
      <ManualChildCreationTrigger />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Children</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your children's accounts
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Child Account</DialogTitle>
              <DialogDescription>
                Create a new student account for your child
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="relation">Relation</Label>
                <Select value={relation} onValueChange={setRelation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <AddChildForm
                defaultCountry={guardianCountry || 'US'}
                onSubmit={handleAddChild}
                isSubmitting={addChildMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!children || children.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't added any children yet
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Child
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((link) => {
            const child = link.children;
            const user = child?.users;
            
            return (
              <Card key={link.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {user?.first_name} {user?.last_name}
                    </span>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {link.relation}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{user?.email}</span>
                  </div>
                  
                  {child?.grade && (
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Grade: {child.grade}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground capitalize">
                      Status: {child?.status}
                    </span>
                  </div>
                  
                  <div className="pt-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/guardian/child/${child.id}`)}
                    >
                      Open Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
