import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './FileUploader';
import { TranslationProgress } from './TranslationProgress';
import { TranslationComplete } from './TranslationComplete';
import { LanguageSelector } from './LanguageSelector';
import { ModelSelector } from './ModelSelector';
import { creditBalanceService } from '../services/creditBalanceService';
import { apiService } from '../services/apiService';

type TranslationStatus = 'idle' | 'uploading' | 'translating' | 'completed' | 'error';

export const TranslationContainer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [bilingualFileUrl, setBilingualFileUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<TranslationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('lt');
  const [translationComplete, setTranslationComplete] = useState(false);
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [usedCredits, setUsedCredits] = useState<number | null>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState('grok-3-mini');
  
  // Constants for polling configuration
  const INITIAL_CHECK_INTERVAL = 3000; // 3 seconds for first checks
  const STANDARD_CHECK_INTERVAL = 10000; // 10 seconds for regular polling
  const SLOW_CHECK_INTERVAL = 20000; // 20 seconds after extended processing
  const MAX_WAIT_TIME = 20 * 60 * 1000; // 20 minutes
  const MAX_CHECK_COUNT = Math.ceil(MAX_WAIT_TIME / STANDARD_CHECK_INTERVAL);
  const TRANSITION_TO_STANDARD = 3; // After 3 checks, move to standard interval
  const TRANSITION_TO_SLOW = 12; // After 12 checks (~2 minutes), slow down polling

  // Refresh credit balance after successful translation
  useEffect(() => {
    if (status === 'completed') {
      creditBalanceService.fetchCreditBalance()
        .then(() => console.log('Credit balance updated after translation'))
        .catch(err => console.error('Failed to update credit balance:', err));
    }
  }, [status]);

  // Status polling effect
  useEffect(() => {
    let statusInterval: number | undefined;
    
    const checkTranslationStatus = async () => {
      if (taskId && status === 'translating') {
        try {
          console.log(`Checking translation status for task: ${taskId} (check #${statusCheckCount + 1})`);
          
          const statusResult = await apiService.checkTranslationStatus(taskId);
          setStatusCheckCount(prev => prev + 1);
          
          if (statusResult.status === 'completed') {
            console.log(`Translation completed. File URL: ${statusResult.translatedFileUrl || statusResult.fileUrl}`);
            setStatus('completed');
            setProgress(100);
            
            // Safely handle URL values - handle both property names
            if (statusResult.translatedFileUrl) {
              // Ensure fileUrl is a string
              const fileUrl = typeof statusResult.translatedFileUrl === 'string' 
                ? statusResult.translatedFileUrl 
                : String(statusResult.translatedFileUrl);
                
              setTranslatedFileUrl(fileUrl);
              console.log('Set translated file URL:', fileUrl);
            } else if (statusResult.fileUrl) {
              // Fallback to fileUrl if translatedFileUrl is not present
              const fileUrl = typeof statusResult.fileUrl === 'string' 
                ? statusResult.fileUrl 
                : String(statusResult.fileUrl);
                
              setTranslatedFileUrl(fileUrl);
              console.log('Set translated file URL (from fileUrl):', fileUrl);
            } else {
              console.warn('No fileUrl in completed translation response');
              setTranslatedFileUrl(null);
            }
            
            // Safely handle bilingual URL - handle both property names
            if (statusResult.translatedBilingualFileUrl) {
              // Ensure bilingualFileUrl is a string
              const bilingualUrl = typeof statusResult.translatedBilingualFileUrl === 'string'
                ? statusResult.translatedBilingualFileUrl
                : String(statusResult.translatedBilingualFileUrl);
                
              setBilingualFileUrl(bilingualUrl);
              console.log('Set bilingual file URL:', bilingualUrl);
            } else if (statusResult.bilingualFileUrl) {
              // Fallback to bilingualFileUrl if translatedBilingualFileUrl is not present
              const bilingualUrl = typeof statusResult.bilingualFileUrl === 'string'
                ? statusResult.bilingualFileUrl
                : String(statusResult.bilingualFileUrl);
                
              setBilingualFileUrl(bilingualUrl);
              console.log('Set bilingual file URL (from bilingualFileUrl):', bilingualUrl);
            } else {
              console.log('No bilingual file URL in response');
              setBilingualFileUrl(null);
            }
            
            setUsedCredits(statusResult.usedCredits || null);
            setTokenCount(statusResult.tokenCount || null);
            setTranslationComplete(true);
            
            // Clear interval when completed
            if (statusInterval) {
              clearInterval(statusInterval);
            }
          } else if (statusResult.status === 'error') {
            console.error('Translation error:', statusResult.message);
            setStatus('error');
            setError(statusResult.message || 'Įvyko nežinoma klaida');
            
            // Clear interval on error
            if (statusInterval) {
              clearInterval(statusInterval);
            }
          } else {
            // Update progress
            const newProgress = statusResult.progress || calculateApproximateProgress(statusCheckCount);
            setProgress(newProgress);
            console.log(`Translation in progress: ${newProgress}%`);
            
            // Adjust check interval based on number of checks
            if (statusCheckCount === TRANSITION_TO_STANDARD && statusInterval) {
              console.log('Switching to standard polling interval');
              clearInterval(statusInterval);
              statusInterval = window.setInterval(checkTranslationStatus, STANDARD_CHECK_INTERVAL);
            } else if (statusCheckCount === TRANSITION_TO_SLOW && statusInterval) {
              console.log('Switching to slow polling interval');
              clearInterval(statusInterval);
              statusInterval = window.setInterval(checkTranslationStatus, SLOW_CHECK_INTERVAL);
            }
            
            // Check if max wait time exceeded
            if (statusCheckCount >= MAX_CHECK_COUNT) {
              setStatus('error');
              setError('Viršytas maksimalus vertimo laukimo laikas');
              if (statusInterval) clearInterval(statusInterval);
            }
          }
        } catch (err) {
          console.error('Error checking translation status:', err);
          
          // Don't immediately fail on a single error - allow retries
          if (statusCheckCount > 5) {
            setStatus('error');
            setError('Nepavyko patikrinti vertimo būsenos');
            
            // Clear interval on persistent errors
            if (statusInterval) {
              clearInterval(statusInterval);
            }
          }
        }
      }
    };
    
    // Start polling if we have a taskId and are in translating status
    if (taskId && status === 'translating') {
      // Initial check after a short delay
      setTimeout(checkTranslationStatus, 1000);
      
      // Then start regular polling
      statusInterval = window.setInterval(checkTranslationStatus, INITIAL_CHECK_INTERVAL);
    }
    
    return () => {
      if (statusInterval) {
        clearInterval(statusInterval);
      }
    };
  }, [taskId, status]);
  
  // Function to calculate approximate progress based on the number of status checks
  const calculateApproximateProgress = (checkCount: number): number => {
    // Estimate progress: start slow, accelerate in the middle, slow down at the end
    if (checkCount < 5) {
      // Initial progress (0-20%)
      return Math.min(20, checkCount * 4);
    } else if (checkCount < 15) {
      // Middle progress (20-70%)
      return Math.min(70, 20 + (checkCount - 5) * 5);
    } else {
      // Final progress (70-95%)
      return Math.min(95, 70 + (checkCount - 15) * 1);
    }
  };

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setStatus('uploading');
    setError(null);
    setTranslatedFileUrl(null);
    setBilingualFileUrl(null);
    setTranslationComplete(false);
    setStatusCheckCount(0);
    setProgress(0);
    setUsedCredits(null);
    setTokenCount(null);
    
    try {
      // Directly start the translation process
      console.log('Starting translation process...');
      console.log('Uploading file:', uploadedFile.name, 'Size:', uploadedFile.size);
      
      try {
        const result = await apiService.startTranslation({
          file: uploadedFile,
          fromLang: sourceLanguage,
          toLang: targetLanguage,
          model: selectedModel,
          shouldTranslateImage: 'false',
        });
        
        if (result.success && result.taskId) {
          setTaskId(result.taskId);
          setStatus('translating');
          setProgress(0);
          console.log(`Translation started with task ID: ${result.taskId}`);
        } else {
          setStatus('error');
          setError(result.message || 'Nepavyko pradėti vertimo');
          console.error('Failed to start translation:', result.message);
        }
      } catch (err) {
        console.error('API request error:', err);
        setStatus('error');
        setError('Serveris nepasiekiamas. Įsitikinkite, kad paleistas backend serveris naudojant "npm run server" arba "npm run dev:all"');
      }
    } catch (err) {
      setStatus('error');
      setError('Nepavyko pradėti vertimo proceso');
      console.error(err);
    }
  }, [sourceLanguage, targetLanguage, selectedModel]);

  const resetTranslation = useCallback(() => {
    setFile(null);
    setTranslatedFileUrl(null);
    setBilingualFileUrl(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setTaskId(null);
    setTranslationComplete(false);
    setStatusCheckCount(0);
    setUsedCredits(null);
    setTokenCount(null);
    console.log('Translation state reset');
  }, []);

  return (
    <section className="py-12">
      <div className="container-guru">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Teida PDF Vertėjas</h1>
          <p className="text-surface-600 text-xl max-w-3xl mx-auto">
            Panaikinkite kalbos barjerus vos keliais paspaudimais
          </p>
        </div>
        
        {status === 'idle' && (
          <>
            <div className="max-w-3xl mx-auto mb-8">
              <LanguageSelector 
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                onSourceChange={setSourceLanguage}
                onTargetChange={setTargetLanguage}
              />
            </div>
            
            <div className="max-w-3xl mx-auto mb-4">
              <ModelSelector 
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
            
            <div className="max-w-3xl mx-auto">
              <FileUploader onFileUpload={handleFileUpload} />
            </div>
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="card-guru p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-guru-50 rounded-full p-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 6V12L16 14" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Greitas</h3>
                <p className="text-surface-600 text-sm">
                  Išverskite PDF failus per kelias minutes naudodami automatizuotą Eiternus debesį, kuriame gyvena Dirbtinis Intelektas 
                </p>
              </div>
              
              <div className="card-guru p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-guru-50 rounded-full p-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Lengva naudoti</h3>
                <p className="text-surface-600 text-sm">
                  Tiesiog numeskite savo .pdf failą arba paspauskite pasirinkti. Svarbiausia - nustatykite, kad verčiate į Lietuvių kalbą
                </p>
              </div>
              
              <div className="card-guru p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-guru-50 rounded-full p-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.2399 7.76001L14.1199 14.12L7.75991 16.24L9.87991 9.88001L16.2399 7.76001Z" stroke="#D02340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Privatumo apsauga</h3>
                <p className="text-surface-600 text-sm">
                  Jūsų failai automatiškai ištrinami po apdorojimo, užtikrinant duomenų privatumą
                </p>
              </div>
            </div>
          </>
        )}
        
        {(status === 'uploading' || status === 'translating') && (
          <div className="max-w-3xl mx-auto">
            <TranslationProgress 
              file={file} 
              status={status} 
              progress={progress} 
              model={selectedModel}
            />
            
            {status === 'translating' && statusCheckCount > 5 && (
              <div className="mt-4 bg-guru-50 p-4 rounded-md text-center">
                <p className="text-guru-700">
                  Vertimas gali užtrukti iki 15 minučių. Vertimo būsena atnaujinama automatiškai.
                </p>
              </div>
            )}
          </div>
        )}
        
        {status === 'completed' && (
          <div className="max-w-3xl mx-auto">
            <TranslationComplete 
              file={file}
              translatedFileUrl={translatedFileUrl}
              bilingualFileUrl={bilingualFileUrl}
              onReset={resetTranslation}
            />
            
            {usedCredits !== null && (
              <div className="mt-4 bg-guru-50 p-4 rounded-md text-center">
                <p className="text-guru-700">
                  Panaudota kreditų: <strong>{usedCredits}</strong> • Teksto ženklų: <strong>{tokenCount || 'Nežinoma'}</strong>
                </p>
              </div>
            )}
            
            {bilingualFileUrl && (
              <div className="mt-4 bg-white p-4 rounded-md border border-guru-200 text-center">
                <p className="text-guru-700 mb-2">
                  Taip pat galite atsisiųsti dvikalbę versiją:
                </p>
                <a 
                  href={bilingualFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Atsisiųsti dvikalbę versiją
                </a>
              </div>
            )}
          </div>
        )}
        
        {status === 'error' && (
          <div className="max-w-3xl mx-auto mt-8 text-center">
            <div className="bg-red-50 text-red-600 p-6 rounded-xl mb-6 border border-red-200">
              <p className="font-medium text-lg">Vertimas nepavyko</p>
              {error && <p className="mt-2 text-red-500">{error}</p>}
              {error && error.includes('Serveris nepasiekiamas') && (
                <div className="mt-4 p-4 bg-red-100 rounded-md text-left">
                  <p className="font-medium">Sprendimas:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Paleiskite backend serverį naudodami komandą <code className="bg-red-50 px-2 py-1 rounded">npm run server</code></li>
                    <li>Arba paleiskite abu serverius vienu metu naudodami <code className="bg-red-50 px-2 py-1 rounded">npm run dev:all</code></li>
                  </ol>
                </div>
              )}
            </div>
            <button
              onClick={resetTranslation}
              className="btn-primary"
            >
              Bandyti dar kartą
            </button>
          </div>
        )}
      </div>
    </section>
  );
};