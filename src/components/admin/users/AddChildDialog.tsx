
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User } from '@/types/admin';
import { z } from 'zod';
import { toast } from 'sonner';

const addChildSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  firstName: z.string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(100, { message: "First name must be less than 100 characters" }),
  lastName: z.string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(100, { message: "Last name must be less than 100 characters" })
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
  const [childEmail, setChildEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddChildAccount = async () => {
    try {
      // Validate input data
      const validatedData = addChildSchema.parse({
        email: childEmail,
        firstName: childFirstName,
        lastName: childLastName
      });

      setIsSubmitting(true);
      
      await onAddChild(validatedData.email, validatedData.firstName, validatedData.lastName);
      
      // Reset form fields
      setChildEmail('');
      setChildFirstName('');
      setChildLastName('');
      onOpenChange(false);
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
            <Label htmlFor="childEmail" className="text-right">
              Email
            </Label>
            <Input
              id="childEmail"
              type="email"
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              className="col-span-3"
              placeholder="child@example.com"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              First name
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
              Last name
            </Label>
            <Input
              id="lastName"
              value={childLastName}
              onChange={(e) => setChildLastName(e.target.value)}
              className="col-span-3"
            />
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
