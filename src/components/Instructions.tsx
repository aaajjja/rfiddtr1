
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';

const Instructions: React.FC = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <AlertCircle className="mr-2 h-4 w-4" />
          Instructions & Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-sm space-y-2">
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Attendance is recorded automatically based on the time of day.</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Scan your card once for Time In and once again for Time Out.</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>If your card is not registered, please contact the administrator.</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary mr-2">•</span>
            <span>Morning: 8:00 AM to 12:00 PM, Afternoon: 1:00 PM to 5:00 PM.</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default Instructions;
