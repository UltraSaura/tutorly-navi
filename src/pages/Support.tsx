import React from 'react';

const Support = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Support</h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Get Help</h2>
          <p className="text-muted-foreground mb-4">
            Need assistance? We're here to help you succeed in your learning journey.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground">
                Email us at support@example.com for technical assistance.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">FAQ</h3>
              <p className="text-sm text-muted-foreground">
                Check our frequently asked questions for quick answers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;