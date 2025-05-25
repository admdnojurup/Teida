import React from 'react';
import { ArrowRight } from 'lucide-react';

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onSourceChange: (language: string) => void;
  onTargetChange: (language: string) => void;
}

const languages = [
  { code: 'auto', name: 'Automatinis aptikimas' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'en', name: 'Anglų' },
  { code: 'es', name: 'Ispanų' },
  { code: 'fr', name: 'Prancūzų' },
  { code: 'de', name: 'Vokiečių' },
  { code: 'it', name: 'Italų' },
  { code: 'pt', name: 'Portugalų' },
  { code: 'ru', name: 'Rusų' },
  { code: 'zh', name: 'Kinų' },
  { code: 'ja', name: 'Japonų' },
  { code: 'ko', name: 'Korėjiečių' },
  { code: 'ar', name: 'Arabų' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  sourceLanguage,
  targetLanguage,
  onSourceChange,
  onTargetChange
}) => {
  const handleSwapLanguages = () => {
    if (sourceLanguage !== 'auto') {
      const temp = sourceLanguage;
      onSourceChange(targetLanguage);
      onTargetChange(temp);
    }
  };

  return (
    <div className="card-guru p-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="w-full md:w-5/12">
          <label htmlFor="source-language" className="block text-sm font-medium text-surface-500 mb-1">
            Iš
          </label>
          <select
            id="source-language"
            value={sourceLanguage}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full py-2 px-3 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-guru-500 focus:border-guru-500"
          >
            {languages.map((lang) => (
              <option key={`source-${lang.code}`} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="my-4 md:my-0">
          <button 
            onClick={handleSwapLanguages}
            disabled={sourceLanguage === 'auto'}
            className={`p-2 rounded-full ${
              sourceLanguage === 'auto' 
                ? 'bg-surface-100 text-surface-400 cursor-not-allowed' 
                : 'bg-guru-50 text-guru-500 hover:bg-guru-100'
            } transition-colors`}
          >
            <ArrowRight size={20} className="transform rotate-90 md:rotate-0" />
          </button>
        </div>
        
        <div className="w-full md:w-5/12">
          <label htmlFor="target-language" className="block text-sm font-medium text-surface-500 mb-1">
            Į
          </label>
          <select
            id="target-language"
            value={targetLanguage}
            onChange={(e) => onTargetChange(e.target.value)}
            className="w-full py-2 px-3 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-guru-500 focus:border-guru-500"
          >
            {languages.filter(lang => lang.code !== 'auto').map((lang) => (
              <option key={`target-${lang.code}`} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};