import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ClockProps {
  className?: string;
}

const Clock: React.FC<ClockProps> = ({ className }) => {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setDateTime(new Date());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  return (
    <div className={`text-center ${className}`}>
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-lg border-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
        <div className="text-sm font-medium text-slate-600 sm:order-2">
          {format(dateTime, 'EEEE, MMMM d, yyyy')}
        </div>
        <div className="text-2xl sm:text-3xl font-bold clock-display text-slate-800 tracking-tight sm:order-1">
          {format(dateTime, 'hh:mm:ss a')}
        </div>
      </div>
    </div>
  );
};

export default Clock;