import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Clock from './Clock';
import RFIDInput from './RFIDInput';
import StatusDisplay from './StatusDisplay';
import Instructions from './Instructions';
import { ScanResult } from '../types';
import { recordAttendance } from '../services/attendanceService';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

const DTRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { toast } = useToast();
  
  const handleScan = useCallback(async (cardUID: string) => {
    if (isProcessing) {
      console.log("Scan already in progress, ignoring request");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.time('scan-processing');
      const result = await recordAttendance(cardUID);
      console.timeEnd('scan-processing');
      
      setScanResult(result);
      
      toast({
        title: result.success ? "Scan Successful" : "Scan Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({
        success: false,
        message: "System error occurred. Please try again."
      });
      
      toast({
        title: "System Error",
        description: "Failed to process scan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-emerald-50 to-slate-50 px-2 py-2 sm:py-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Horizontal layout for landscape */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">MMSU Attendance System</h1>
              <p className="text-sm sm:text-base text-slate-600">Daily Time Record</p>
            </div>
          </div>
          <Clock className="mt-2 sm:mt-0" />
        </div>

        {/* Main Content - Two-column layout for landscape */}
        <div className="grid sm:grid-cols-2 gap-2 sm:gap-4">
          {/* Left Column - Scanner and Status */}
          <div className="space-y-2 sm:space-y-4">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-4 space-y-4">
                <StatusDisplay scanResult={scanResult} isProcessing={isProcessing} />
                <Separator className="my-2 sm:my-3" />
                <RFIDInput onScan={handleScan} isProcessing={isProcessing} />
              </CardContent>
            </Card>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-0 shadow-lg bg-blue-600 text-white">
                <CardContent className="p-2 sm:p-3 text-center">
                  <div className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1">Time In</div>
                  <div className="text-xs text-blue-100">Morning: 8:00 AM</div>
                  <div className="text-xs text-blue-100">Afternoon: 1:00 PM</div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-emerald-600 text-white">
                <CardContent className="p-2 sm:p-3 text-center">
                  <div className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1">Time Out</div>
                  <div className="text-xs text-emerald-100">Morning: 12:00 PM</div>
                  <div className="text-xs text-emerald-100">Afternoon: 5:00 PM</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-slate-600 text-white">
                <CardContent className="p-2 sm:p-3 text-center">
                  <div className="text-sm sm:text-base font-bold mb-0.5 sm:mb-1">Support</div>
                  <div className="text-xs text-slate-100">Need help?</div>
                  <div className="text-xs text-slate-100">IT Support</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div className="h-full relative">
            <Instructions />
            <Link to="/admin" className="absolute bottom-2 right-2">
              <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur-sm shadow-lg">
                <Settings className="w-4 h-4 mr-1" />
                Admin Panel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DTRScanner;