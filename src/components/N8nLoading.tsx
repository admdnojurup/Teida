import React from 'react';

interface N8nLoadingProps {
  message?: string;
  progress?: number;
}

export const N8nLoading: React.FC<N8nLoadingProps> = ({ 
  message = 'Siunčiama į n8n...',
  progress
}) => {
  return (
    <div className="card-guru p-8">
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24 mb-6">
          <div className="w-24 h-24 border-4 border-guru-500 border-t-transparent rounded-full animate-spin"></div>
          {progress !== undefined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-guru-500 font-bold">{progress}%</span>
            </div>
          )}
        </div>
        <h3 className="text-xl font-medium mb-2">
          {message}
        </h3>
        <p className="text-surface-600 text-center">
          Jūsų failas yra siunčiamas į n8n scenarijų. Prašome palaukti.
        </p>
      </div>
    </div>
  );
};