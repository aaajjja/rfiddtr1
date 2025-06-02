import React from 'react';
import { Card } from "@/components/ui/card";
import { ScanResult } from '../types';
import { CheckCircle, XCircle, ScanLine } from "lucide-react";

interface StatusDisplayProps {
  result: ScanResult | null;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="flex items-center gap-3 text-center text-slate-500 bg-slate-50/80 rounded-lg p-4 border border-slate-100">
        <ScanLine className="w-5 h-5 flex-shrink-0" />
        <span className="text-base">Please scan your RFID card</span>
      </div>
    );
  }

  const { success, message } = result;
  const Icon = success ? CheckCircle : XCircle;
  const styles = success ? {
    background: 'bg-emerald-50/80',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    icon: 'text-emerald-600'
  } : {
    background: 'bg-rose-50/80',
    border: 'border-rose-100',
    text: 'text-rose-700',
    icon: 'text-rose-600'
  };
  
  return (
    <div className={`flex items-center gap-3 text-center ${styles.background} rounded-lg p-4 border ${styles.border}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${styles.icon}`} />
      <span className={`text-base ${styles.text}`}>{message}</span>
    </div>
  );
};

export default StatusDisplay;