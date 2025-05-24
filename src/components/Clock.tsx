
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
      <div className="text-lg font-medium text-muted-foreground">
        {format(dateTime, 'EEEE, MMMM d, yyyy')}
      </div>
      <div className="text-4xl font-bold clock-display">
        {format(dateTime, 'hh:mm:ss a')}
      </div>
    </div>
  );
};

export default Clock;
