'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ToolsResponse, BuiltinTool, ExtensionTool, McpTool } from '@/app/api/tools/route';

type ToolsContextType = {
  builtin: BuiltinTool[];
  extension: ExtensionTool[];
  mcp: McpTool[];
  all: (BuiltinTool | ExtensionTool | McpTool)[];
  getByExtension: (extensionName: string) => ExtensionTool[];
};

const ToolsContext = createContext<ToolsContextType | undefined>(undefined);

export function ToolsProvider({
  children,
  initialTools,
}: {
  children: ReactNode;
  initialTools: ToolsResponse;
}) {
  const all = [
    ...initialTools.builtin,
    ...initialTools.extension,
    ...initialTools.mcp,
  ];

  const getByExtension = (extensionName: string) =>
    initialTools.extension.filter(t => t.extension === extensionName);

  return (
    <ToolsContext.Provider
      value={{
        builtin: initialTools.builtin,
        extension: initialTools.extension,
        mcp: initialTools.mcp,
        all,
        getByExtension,
      }}
    >
      {children}
    </ToolsContext.Provider>
  );
}

const EMPTY: ToolsContextType = {
  builtin: [], extension: [], mcp: [], all: [], getByExtension: () => [],
};

export function useTools() {
  return useContext(ToolsContext) ?? EMPTY;
}
