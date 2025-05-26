import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScanResult } from '../types';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusDisplayProps {
  scanResult: ScanResult | null;
  isProcessing: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ scanResult, isProcessing }) => {
  const [animate, setAnimate] = useState(false);
  
  // Apply animation when scan result changes
  useEffect(() => {
    if (scanResult) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  // Determine the status icon and colors
  const getStatusDetails = () => {
    if (isProcessing) {
      return {
        icon: <Clock className="h-12 w-12 animate-spin" />,
        color: 'bg-amber-50 border-amber-200 text-amber-700',
        bgColor: 'bg-amber-100',
        message: 'Processing your scan...',
        title: 'Please Wait'
      };
    }
    
    if (!scanResult) {
      return {
        icon: <AlertCircle className="h-12 w-12" />,
        color: 'bg-blue-50 border-blue-200 text-blue-700',
        bgColor: 'bg-blue-100',
        message: 'Ready to scan your RFID card',
        title: 'Scan Ready'
      };
    }
    
    if (scanResult.success) {
      return {
        icon: <CheckCircle className="h-12 w-12" />,
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        bgColor: 'bg-emerald-100',
        message: scanResult.message,
        title: scanResult.action || 'Success'
      };
    }
    
    return {
      icon: <XCircle className="h-12 w-12" />,
      color: 'bg-red-50 border-red-200 text-red-700',
      bgColor: 'bg-red-100',
      message: scanResult.message,
      title: 'Scan Failed'
    };
  };

  const { icon, color, bgColor, message, title } = getStatusDetails();
  
  return (
    <Card className={cn(
      "border-2 transition-all duration-300 min-w-80 shadow-lg", 
      color,
      animate && "scale-105 shadow-xl"
    )}>
      <CardContent className="pt-8 pb-8 px-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={cn("p-4 rounded-full", bgColor)}>
            {icon}
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-xl">
              {title}
            </h3>
            <p className="text-base leading-relaxed max-w-sm">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusDisplay;