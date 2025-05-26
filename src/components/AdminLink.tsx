
import React from 'react';
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLink: React.FC = () => {
  return (
    <div className="absolute top-6 right-6 z-10">
      <Link to="/admin">
        <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm border-slate-200 text-slate-700 hover:bg-white hover:text-slate-900 shadow-lg">
          <Settings className="h-4 w-4 mr-1" />
          Admin Panel
        </Button>
      </Link>
    </div>
  );
};

export default AdminLink;