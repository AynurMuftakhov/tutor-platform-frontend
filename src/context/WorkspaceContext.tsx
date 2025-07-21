import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the types of tools that can be displayed in the workspace
export type WorkspaceTool = 'materials' | 'video' | 'whiteboard' | null;

interface WorkspaceContextType {
  currentTool: WorkspaceTool;
  setCurrentTool: (tool: WorkspaceTool) => void;
}

// Create the context with a default value
const WorkspaceContext = createContext<WorkspaceContextType>({
  currentTool: 'materials',
  setCurrentTool: () => {
    throw new Error('setCurrentTool must be used within a WorkspaceProvider');
  },
});
// Custom hook to use the workspace context
export const useWorkspace = () => useContext(WorkspaceContext);

// Provider component
interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [currentTool, setCurrentTool] = useState<WorkspaceTool>('materials');

  return (
    <WorkspaceContext.Provider value={{ currentTool, setCurrentTool }}>
      {children}
    </WorkspaceContext.Provider>
  );
};
