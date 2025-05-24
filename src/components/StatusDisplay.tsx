
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
        icon: <Clock className="h-8 w-8 animate-spin" />,
        color: 'bg-warning/10 text-warning',
        message: 'Processing scan...'
      };
    }
    
    if (!scanResult) {
      return {
        icon: <AlertCircle className="h-8 w-8" />,
        color: 'bg-muted text-muted-foreground',
        message: 'Scan your RFID Card'
      };
    }
    
    if (scanResult.success) {
      return {
        icon: <CheckCircle className="h-8 w-8" />,
        color: 'bg-success/10 text-success',
        message: scanResult.message
      };
    }
    
    return {
      icon: <XCircle className="h-8 w-8" />,
      color: 'bg-destructive/10 text-destructive',
      message: scanResult.message
    };
  };

  const { icon, color, message } = getStatusDetails();
  
  return (
    <Card className={cn(
      "border transition-all", 
      color,
      animate && "scan-animation"
    )}>
      <CardContent className="pt-6 pb-6 px-6">
        <div className="flex items-center space-x-4">
          {icon}
          <div>
            <h3 className="font-medium text-lg">
              {scanResult?.action || "Ready"}
            </h3>
            <p className="text-sm">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusDisplay;
