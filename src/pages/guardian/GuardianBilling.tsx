import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, Calendar, DollarSign, CheckCircle } from 'lucide-react';

export default function GuardianBilling() {
  const { billingCustomerId } = useGuardianAuth();

  // Mock billing data (replace with Stripe integration)
  const currentPlan = {
    name: 'Premium Family',
    price: 29.99,
    billingCycle: 'monthly',
    nextBillingDate: '2024-11-12',
    children: 3,
    maxChildren: 5,
  };

  const paymentMethod = {
    type: 'Visa',
    last4: '4242',
    expiry: '12/25',
  };

  const invoices = [
    { id: '1', date: '2024-10-12', amount: 29.99, status: 'paid' },
    { id: '2', date: '2024-09-12', amount: 29.99, status: 'paid' },
    { id: '3', date: '2024-08-12', amount: 29.99, status: 'paid' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Current Plan
              </CardTitle>
              <CardDescription className="mt-2">
                You are on the <strong>{currentPlan.name}</strong> plan
              </CardDescription>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-2xl font-bold">${currentPlan.price}</p>
              <p className="text-xs text-muted-foreground">per {currentPlan.billingCycle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Children</p>
              <p className="text-2xl font-bold">{currentPlan.children}/{currentPlan.maxChildren}</p>
              <p className="text-xs text-muted-foreground">active accounts</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing</p>
              <p className="text-lg font-semibold">{currentPlan.nextBillingDate}</p>
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm">
                Change Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{paymentMethod.type} ending in {paymentMethod.last4}</p>
                <p className="text-sm text-muted-foreground">Expires {paymentMethod.expiry}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            Download your invoices and payment receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">{invoice.date}</p>
                    <p className="text-sm text-muted-foreground">
                      Invoice #{invoice.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">${invoice.amount.toFixed(2)}</p>
                    <Badge
                      variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline">Cancel Subscription</Button>
          <Button variant="outline">Request Refund</Button>
        </CardContent>
      </Card>
    </div>
  );
}

