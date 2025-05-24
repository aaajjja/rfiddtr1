
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scan } from "lucide-react";

interface RFIDInputProps {
  onScan: (cardUID: string) => void;
  isProcessing: boolean;
}

const RFIDInput: React.FC<RFIDInputProps> = ({ onScan, isProcessing }) => {
  const [cardUID, setCardUID] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus the hidden input when component mounts
  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (inputRef.current && !isProcessing) {
        inputRef.current.focus();
      }
    }, 500);
    
    return () => clearInterval(focusInterval);
  }, [isProcessing]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cardUID.length > 0) {
      onScan(cardUID);
      setCardUID('');
    }
  };

  const handleScanButtonClick = () => {
    // Example cards for demo: 12345678, 87654321, 11223344
    if (cardUID.length > 0) {
      onScan(cardUID);
      setCardUID('');
    }
    inputRef.current?.focus();
  };

  // For simulation purposes, we're showing an input field
  // In a real system, this would be hidden and automatically populated by the RFID reader
  return (
    <Card className="border border-primary/20">
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">Scan RFID Card</h3>
          <p className="text-sm text-muted-foreground">
            For demo purposes, use these sample card UIDs: <br />
            <span className="font-mono">12345678, 87654321, 11223344</span>
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            type="text"
            value={cardUID}
            onChange={(e) => setCardUID(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter Card UID"
            className={`border-2 ${isFocused ? 'border-primary' : 'border-muted'}`}
            disabled={isProcessing}
          />
          <Button
            onClick={handleScanButtonClick}
            disabled={isProcessing || !cardUID}
            className="flex-shrink-0"
          >
            <Scan className="mr-2 h-4 w-4" />
            Scan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RFIDInput;
