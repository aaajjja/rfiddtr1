import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard } from "lucide-react";

interface RFIDInputProps {
  onScan: (cardUID: string) => void;
  isProcessing: boolean;
}

const RFIDInput = forwardRef<{ focus: () => void }, RFIDInputProps>(({ onScan, isProcessing }, ref) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  useEffect(() => {
    // Focus input on mount and after each scan
    inputRef.current?.focus();
  }, [isProcessing]);

  const processInput = (value: string) => {
    // Clean the input: remove whitespace, newlines, carriage returns
    const cleanValue = value.trim().replace(/[\r\n]/g, '');
    
    // Convert to uppercase for consistency (if your UIDs are hex)
    const normalizedValue = cleanValue.toUpperCase();
    
    // Only process if we have a meaningful value
    if (normalizedValue.length >= 4) { // Adjust minimum length as needed
      console.log('Processing RFID input:', normalizedValue); // Debug log
      onScan(normalizedValue);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // For RFID readers, set a short timeout to handle rapid input
    timeoutRef.current = setTimeout(() => {
      if (value.length >= 4) { // Minimum reasonable UID length
        processInput(value);
      }
    }, 100); // 100ms timeout to allow for complete input
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle Enter key press (common with RFID readers)
    if (e.key === 'Enter') {
      e.preventDefault();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      processInput(input);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <CreditCard className="h-5 w-5" />
      </div>
      <Input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isProcessing}
        className="h-12 pl-11 pr-10 bg-white border-slate-200 text-slate-800 text-base placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500"
        placeholder="Scan your RFID card..."
        autoComplete="off"
        spellCheck={false}
      />
      {isProcessing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        </div>
      )}
    </div>
  );
});

export default RFIDInput;