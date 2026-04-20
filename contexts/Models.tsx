'use client';

import { ModelResponse } from '@/app/api/models/route';
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Updated Type to allow null (since initial state is null)
type ModelContextType = {
  models: ModelResponse | null;
  setModels: (models: ModelResponse | null) => void;
};

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({
  children,
  initialModels = null,
}: {
  children: ReactNode;
  initialModels?: ModelResponse | null;
}) {
  // 2. State now matches the Context Type exactly
  const [models, setModels] = useState<ModelResponse | null>(initialModels);

  return (
    <ModelContext.Provider value={{ models, setModels }}>
      {children}
    </ModelContext.Provider>
  );
}

export const useModels = () => {
  return useContext(ModelContext) ?? { models: null, setModels: () => {} };
};
