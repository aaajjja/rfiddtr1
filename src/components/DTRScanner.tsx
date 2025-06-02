import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Clock from './Clock';
import RFIDInput from './RFIDInput';
import StatusDisplay from './StatusDisplay';
import Instructions from './Instructions';
import { ScanResult, AttendanceAction } from '../types';
import { recordAttendance } from '../services/attendanceService';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Clock as ClockIcon, SunMedium, Moon, CheckCircle2, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

const DTRScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<AttendanceAction>('Time In AM');
  const { toast } = useToast();
  const rfidInputRef = useRef<{ focus: () => void }>(null);
  
  const handleActionSelect = (action: AttendanceAction) => {
    setSelectedAction(action);
    // Focus the RFID input field after selecting an action
    rfidInputRef.current?.focus();
  };
  
  const handleScan = useCallback(async (cardUID: string) => {
    if (isProcessing) {
      console.log("Scan already in progress, ignoring request");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.time('scan-processing');
      const result = await recordAttendance(cardUID, selectedAction);
      console.timeEnd('scan-processing');
      
      setScanResult(result);
      
      toast({
        title: result.success ? "Scan Successful" : "Scan Failed",
        description: (
          <div className="flex flex-col items-center gap-4">
            {result.success ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
            <span className="text-base">{result.message}</span>
          </div>
        ),
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
        description: (
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <span className="text-base">Failed to process scan. Please try again.</span>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast, selectedAction]);

  return (
    <div className="min-h-screen bg-[#f8fafb] px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                <ClockIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800">
                  MMSU Attendance System
                </h1>
                <p className="text-base text-slate-500 mt-1">Daily Time Record</p>
              </div>
            </div>
            <Clock className="text-slate-700 text-xl sm:text-2xl font-medium" />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Time In/Out Selection */}
          <Card className="bg-white shadow-sm border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-slate-800 font-semibold">Time Entry</CardTitle>
              <CardDescription className="text-slate-500">Select your time entry action below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                {/* Morning Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <SunMedium className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-medium text-slate-600">Morning Session</h3>
                  </div>
                  <Button
                    variant={selectedAction === 'Time In AM' ? "default" : "outline"}
                    onClick={() => handleActionSelect('Time In AM')}
                    className={`w-full h-12 text-base transition-all duration-200 ${
                      selectedAction === 'Time In AM'
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    Time In AM
                  </Button>
                  <Button
                    variant={selectedAction === 'Time Out AM' ? "default" : "outline"}
                    onClick={() => handleActionSelect('Time Out AM')}
                    className={`w-full h-12 text-base transition-all duration-200 ${
                      selectedAction === 'Time Out AM'
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    Time Out AM
                  </Button>
                </div>

                {/* Afternoon Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-medium text-slate-600">Afternoon Session</h3>
                  </div>
                  <Button
                    variant={selectedAction === 'Time In PM' ? "default" : "outline"}
                    onClick={() => handleActionSelect('Time In PM')}
                    className={`w-full h-12 text-base transition-all duration-200 ${
                      selectedAction === 'Time In PM'
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    Time In PM
                  </Button>
                  <Button
                    variant={selectedAction === 'Time Out PM' ? "default" : "outline"}
                    onClick={() => handleActionSelect('Time Out PM')}
                    className={`w-full h-12 text-base transition-all duration-200 ${
                      selectedAction === 'Time Out PM'
                        ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    Time Out PM
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Scanner and Status */}
          <Card className="bg-white shadow-sm border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-slate-800 font-semibold">RFID Scanner</CardTitle>
              <CardDescription className="text-slate-500">
                {selectedAction} - Please scan your ID card
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RFIDInput ref={rfidInputRef} onScan={handleScan} isProcessing={isProcessing} />
              <StatusDisplay result={scanResult} />
              <Separator className="my-6 bg-slate-100" />
              <Instructions />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default DTRScanner;