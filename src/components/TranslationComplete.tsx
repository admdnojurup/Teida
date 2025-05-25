import React from 'react';
import { Download, FileText, RotateCcw, CheckCircle } from 'lucide-react';

interface TranslationCompleteProps {
  file: File | null;
  translatedFileUrl: string | null;
  bilingualFileUrl?: string | null;
  onReset: () => void;
}

export const TranslationComplete: React.FC<TranslationCompleteProps> = ({ 
  file, 
  translatedFileUrl,
  bilingualFileUrl,
  onReset
}) => {
  // Function to handle file download
  const handleDownload = () => {
    if (translatedFileUrl) {
      // Log the URL to help with debugging
      console.log('Opening translated file URL:', translatedFileUrl);
      window.open(translatedFileUrl, '_blank');
    } else {
      console.error('No translated file URL available');
    }
  };

  return (
    <div className="card-guru p-8">
      <div className="flex flex-col items-center">
        <div className="bg-green-50 rounded-full p-4 mb-4">
          <CheckCircle size={48} className="text-green-500" />
        </div>

        <h3 className="text-2xl font-medium text-surface-800 mb-4">
          Vertimas baigtas!
        </h3>
        
        {file && (
          <div className="w-full my-6 flex items-center justify-center">
            <div className="bg-surface-50 rounded-md p-4 w-full">
              <div className="flex items-center">
                <FileText size={32} className="text-guru-500 mr-4" />
                <div>
                  <p className="font-medium text-surface-800">{file.name}</p>
                  <p className="text-sm text-surface-500">
                    Originalas • {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full">
          {translatedFileUrl && (
            <a
              href={translatedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDownload}
              className="btn-primary flex-1 flex items-center justify-center"
            >
              <Download size={20} className="mr-2" />
              Atsisiųsti išverstą PDF
            </a>
          )}
          
          <button
            onClick={onReset}
            className="btn-outline flex-1 flex items-center justify-center"
          >
            <RotateCcw size={20} className="mr-2" />
            Išversti kitą failą
          </button>
        </div>
      </div>
    </div>
  );
};