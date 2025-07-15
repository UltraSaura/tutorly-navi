import { VariableHelper } from './VariableHelper';

interface VariablePanelProps {
  onInsertVariable: (variableName: string) => void;
}

export const VariablePanel = ({ onInsertVariable }: VariablePanelProps) => {
  return (
    <div className="space-y-6">
      <VariableHelper onInsertVariable={onInsertVariable} />
    </div>
  );
};