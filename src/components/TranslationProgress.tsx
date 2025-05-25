import React from 'react';
import { Loader2, FileText } from 'lucide-react';

interface TranslationProgressProps {
  file: File | null;
  status: 'uploading' | 'translating' | string;
  progress: number;
  model?: string;
}

export const TranslationProgress: React.FC<TranslationProgressProps> = ({ 
  file, 
  status, 
  progress,
  model
}) => {
  const getStatusText = () => {
    if (status === 'uploading') return 'Įkeliamas failas...';
    if (status === 'translating') {
      if (progress < 20) return 'Pradedamas vertimas...';
      if (progress < 50) return 'Verčiamas dokumentas...';
      if (progress < 80) return 'Beveik baigta...';
      return 'Baigiamas vertimas...';
    }
    return 'Apdorojama...';
  };

  return (
    <div className="card-guru p-6">
      {file && (
        <div className="mb-6 flex items-center">
          <FileText size={32} className="text-guru-500 mr-4" />
          <div>
            <p className="font-medium text-surface-800">{file.name}</p>
            <p className="text-sm text-surface-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
              {model && <span className="ml-2">• Modelis: <span className="font-medium">{model}</span></span>}
            </p>
          </div>
        </div>
      )}
      
      <div className="w-full mb-4">
        <div className="w-full bg-surface-100 rounded-full h-3">
          <div 
            className="bg-guru-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-surface-500">
          <span>{progress}%</span>
          <span>{getStatusText()}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-center">
        <Loader2 size={24} className="text-guru-500 mr-3 animate-spin" />
        <p className="text-surface-700">{getStatusText()}</p>
      </div>
      
      {status === 'translating' && (
        <div className="mt-4">
          <p className="text-sm text-surface-500 text-center">
            Vertimas gali užtrukti 5-15 minučių, priklausomai nuo dokumento dydžio ir sudėtingumo.
          </p>
          <p className="mt-2 text-sm text-surface-500 text-center">
            Puslapis automatiškai atsinaujins, kai vertimas bus baigtas.
          </p>
        </div>
      )}
    </div>
  );
};