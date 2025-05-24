import React from 'react';
import AdminDashboard from '../components/AdminDashboard';
import { Toaster } from "@/components/ui/toaster";

const Admin = () => {
  return (
    <div className="min-h-screen bg-accent/50 py-8">
      <AdminDashboard />
      <Toaster />
    </div>
  );
};

export default Admin;
