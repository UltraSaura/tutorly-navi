
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from '@/types/admin';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const addChildSchema = z.object({
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-z0-9_]+$/, "Username can only contain lowercase letters, numbers, and underscores"),
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .optional()
    .or(z.literal('')),
  firstName: z.string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(100, { message: "First name must be less than 100 characters" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(100, { message: "Last name must be less than 100 characters" }),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
  schoolLevel: z.string()
    .min(1, "School level is required")
});

interface AddChildDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedParent: User | null;
  onAddChild: (email: string, firstName: string, lastName: string) => Promise<void>;
}

export const AddChildDialog = ({
  open,
  onOpenChange,
  selectedParent,
  onAddChild
}: AddChildDialogProps) => {
  const [username, setUsername] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [password, setPassword] = useState('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddChildAccount = async () => {
    try {
      // Validate input data
      const validatedData = addChildSchema.parse({
        username,
        email: childEmail,
        firstName: childFirstName,
        lastName: childLastName,
        password,
        schoolLevel
      });

      setIsSubmitting(true);
      
      // Call the Edge Function to create child account
      const { data, error } = await supabase.functions.invoke('create-child-account', {
        body: {
          username: validatedData.username,
          password: validatedData.password || 'defaultPassword123', // Use provided password or default
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email || null,
          schoolLevel: validatedData.schoolLevel,
          relation: 'parent'
        }
      });

      if (error) {
        console.error('Error creating child account:', error);
        toast.error(`Failed to create child account: ${error.message}`);
        return;
      }

      if (data && data.success) {
        toast.success(`Child account created successfully for ${validatedData.firstName}!`);
        
        // Reset form fields
        setUsername('');
        setChildEmail('');
        setChildFirstName('');
        setChildLastName('');
        setPassword('');
        setSchoolLevel('');
        onOpenChange(false);
      } else {
        toast.error('Failed to create child account');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Show validation errors
        error.errors.forEach(err => {
          toast.error(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        console.error('Error adding child account:', error);
        toast.error('Failed to create child account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Child Account</DialogTitle>
          <DialogDescription>
            Create a new student account for this parent's child.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username *
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="col-span-3"
              placeholder="e.g., john_2024"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              First name *
            </Label>
            <Input
              id="firstName"
              value={childFirstName}
              onChange={(e) => setChildFirstName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Last name *
            </Label>
            <Input
              id="lastName"
              value={childLastName}
              onChange={(e) => setChildLastName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="childEmail" className="text-right">
              Email (Optional)
            </Label>
            <Input
              id="childEmail"
              type="email"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              className="col-span-3"
              placeholder="For notifications (optional)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password (Optional)
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              placeholder="Leave empty for default password"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="schoolLevel" className="text-right">
              School Level *
            </Label>
            <Select value={schoolLevel} onValueChange={setSchoolLevel}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select school level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="CE1">CE1</SelectItem>
                <SelectItem value="CE2">CE2</SelectItem>
                <SelectItem value="CM1">CM1</SelectItem>
                <SelectItem value="CM2">CM2</SelectItem>
                <SelectItem value="6EME">6EME</SelectItem>
                <SelectItem value="5EME">5EME</SelectItem>
                <SelectItem value="4EME">4EME</SelectItem>
                <SelectItem value="3EME">3EME</SelectItem>
                <SelectItem value="2NDE">2NDE</SelectItem>
                <SelectItem value="1ERE">1ERE</SelectItem>
                <SelectItem value="TERMINALE">TERMINALE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAddChildAccount} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
