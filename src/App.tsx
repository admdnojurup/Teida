import React, { useState } from 'react';
import Layout from './components/Layout';
import { TranslationContainer } from './components/TranslationContainer';

function App() {
  const [translationComplete, setTranslationComplete] = useState(false);
  
  const handleTranslationComplete = (isComplete: boolean) => {
    setTranslationComplete(isComplete);
  };

  return (
    <Layout onTranslationComplete={translationComplete}>
      <TranslationContainer />
    </Layout>
  );
}

export default App;