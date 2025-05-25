import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  description: string;
  languages: string;
  speed: string;
  recommendedFor: string;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange 
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedModelInfo, setSelectedModelInfo] = useState<Model | null>(null);
  
  useEffect(() => {
    // Load models from the JSON file
    const loadModels = async () => {
      try {
        const response = await fetch('/models-info.json');
        const data = await response.json();
        setModels(data.models);
        
        // Set initial selected model info
        const initialModel = data.models.find((m: Model) => m.id === selectedModel);
        if (initialModel) {
          setSelectedModelInfo(initialModel);
        }
      } catch (error) {
        console.error('Failed to load models information:', error);
      }
    };
    
    loadModels();
  }, [selectedModel]);
  
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    onModelChange(newModelId);
    
    // Update selected model info
    const modelInfo = models.find(m => m.id === newModelId);
    if (modelInfo) {
      setSelectedModelInfo(modelInfo);
    }
  };
  
  return (
    <div className="card-guru p-4">
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="model-select" className="block text-sm font-medium text-surface-500">
            Vertimo modelis
          </label>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="text-guru-500 hover:text-guru-600 transition-colors"
            aria-label={showInfo ? "Slėpti modelio informaciją" : "Rodyti modelio informaciją"}
          >
            <Info size={18} />
          </button>
        </div>
        
        <select
          id="model-select"
          value={selectedModel}
          onChange={handleModelChange}
          className="w-full py-2 px-3 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-guru-500 focus:border-guru-500"
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        
        {showInfo && selectedModelInfo && (
          <div className="mt-3 bg-guru-50 p-3 rounded-md text-sm">
            <h4 className="font-medium text-guru-700 mb-1">{selectedModelInfo.name}</h4>
            <p className="text-surface-700 mb-2">{selectedModelInfo.description}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-guru-600 font-medium">Kalbos: </span>
                <span className="text-surface-700">{selectedModelInfo.languages}</span>
              </div>
              <div>
                <span className="text-guru-600 font-medium">Greitis: </span>
                <span className="text-surface-700">{selectedModelInfo.speed}</span>
              </div>
            </div>
            <div className="mt-1">
              <span className="text-guru-600 font-medium">Rekomenduojama: </span>
              <span className="text-surface-700">{selectedModelInfo.recommendedFor}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};