import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Clock as ClockIcon, CheckCircle, UserCheck } from 'lucide-react';

const Instructions: React.FC = () => {
  return (
    <Card className="border-0 shadow-lg bg-slate-50 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base flex items-center text-slate-700">
          <AlertCircle className="mr-2 h-4 w-4 text-blue-600" />
          How to Use
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-3 w-3 text-blue-600" />
            </div>
            <div className="text-xs text-slate-600 flex-1">
              <strong className="text-slate-700">Step 1:</strong> Position your RFID card near the scanner
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
              <ClockIcon className="h-3 w-3 text-emerald-600" />
            </div>
            <div className="text-xs text-slate-600 flex-1">
              <strong className="text-slate-700">Step 2:</strong> Wait for the confirmation message
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            <div className="text-xs text-slate-600 flex-1">
              <strong className="text-slate-700">Step 3:</strong> Your attendance is automatically recorded
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Instructions;