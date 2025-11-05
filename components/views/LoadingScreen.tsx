import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full">
      <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-yellow-400"></div>
      <p className="mt-4 text-2xl">Generating your next step...</p>
    </div>
  );
};
