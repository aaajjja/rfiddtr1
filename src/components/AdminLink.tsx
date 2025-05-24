
import React from 'react';
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLink: React.FC = () => {
  return (
    <div className="absolute top-4 right-4">
      <Link to="/admin">
        <Button variant="outline" size="sm" className="text-muted-foreground">
          <Settings className="h-4 w-4 mr-1" />
          Admin
        </Button>
      </Link>
    </div>
  );
};

export default AdminLink;
