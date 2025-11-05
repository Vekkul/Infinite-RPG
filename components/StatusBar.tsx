
import React from 'react';

interface StatusBarProps {
  currentValue: number;
  maxValue: number;
  colorClass: string;
  label: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ currentValue, maxValue, colorClass, label }) => {
  const percentage = Math.max(0, (currentValue / maxValue) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center text-lg mb-1">
        <span>{label}</span>
        <span>{currentValue} / {maxValue}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-4 border-2 border-gray-600 overflow-hidden">
        <div
          className={`${colorClass} h-full rounded-full transition-all duration-500 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
