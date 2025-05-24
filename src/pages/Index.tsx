
import React from 'react';
import DTRScanner from '@/components/DTRScanner';
import AdminLink from '@/components/AdminLink';

const Index = () => {
  return (
    <div className="min-h-screen bg-accent/50 py-8">
      <AdminLink />
      <DTRScanner />
    </div>
  );
};

export default Index;
