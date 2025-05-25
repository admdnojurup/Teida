import React, { useCallback, useState } from 'react';
import { Upload, FileText, X, Plus, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = useCallback((file: File): boolean => {
    if (!file.type.includes('pdf')) {
      setError('Priimami tik PDF failai');
      return false;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      setError('Failo dydis viršija 100MB limitą');
      return false;
    }
    
    setError(null);
    return true;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, [validateFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  }, [validateFile]);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedFile) {
      setIsUploading(true);
      
      try {
        // Create a copy of the file to ensure clean transfer
        const fileReader = new FileReader();
        fileReader.onload = function(event) {
          if (event.target && event.target.result) {
            // Create a new Blob from the ArrayBuffer
            const blob = new Blob([event.target.result as ArrayBuffer], { type: 'application/pdf' });
            // Create a new File from the Blob
            const cleanFile = new File([blob], selectedFile.name, { type: 'application/pdf' });
            
            // Pass the cleaned file to the parent component
            onFileUpload(cleanFile);
          }
        };
        
        fileReader.onerror = function() {
          setError('Klaida nuskaitant failą. Bandykite dar kartą.');
          setIsUploading(false);
        };
        
        // Read the file as an ArrayBuffer
        fileReader.readAsArrayBuffer(selectedFile);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Klaida apdorojant failą. Bandykite dar kartą.');
        setIsUploading(false);
      }
    }
  }, [selectedFile, onFileUpload]);

  return (
    <div className="mt-8">
      {!selectedFile ? (
        <div
          className={`upload-area ${
            isDragging ? 'ring-4 ring-guru-300' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-white bg-opacity-20 rounded-full p-6 mb-6">
              <Plus size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">
              Įkelkite arba nutempkite failą
            </h3>
            <p className="text-white text-opacity-80 mb-6">
              Dydis iki 100 MB
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
            />
            <label
              htmlFor="file-upload"
              className="bg-white text-guru-500 font-medium px-6 py-3 rounded-md cursor-pointer hover:bg-guru-50 transition-colors"
            >
              Pasirinkti failą
            </label>
            {error && (
              <div className="mt-4 text-white bg-guru-600 bg-opacity-70 px-4 py-2 rounded-md flex items-center">
                <AlertCircle size={16} className="mr-2" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card-guru p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText size={32} className="text-guru-500 mr-4" />
              <div>
                <p className="font-medium text-surface-800">{selectedFile.name}</p>
                <p className="text-sm text-surface-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button 
              onClick={removeFile}
              className="text-surface-400 hover:text-guru-500 transition-colors"
              disabled={isUploading}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSubmit}
              className={`btn-primary flex items-center ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ruošiamas failas...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  Išversti PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};