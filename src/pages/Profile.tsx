import React from 'react';

const Profile = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">User Profile</h2>
          <p className="text-muted-foreground">
            Manage your profile settings and preferences here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;