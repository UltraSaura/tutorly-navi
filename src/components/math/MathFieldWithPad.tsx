import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { useState } from 'react';
import ChatMathField from './ChatMathField';
import MathPad from './MathPad';
import { useMathField } from '@/hooks/useMathField';

export default function MathFieldWithPad() {
  const ui = useInterfaceTranslation();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { mfRef, insert, next, backspace, insertSnippet } = useMathField();

  return (
    <div className="space-y-4">
      <ChatMathField ref={mfRef} />
      <MathPad 
        insert={insert}
        next={next}
        backspace={backspace}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
      />
      
      {/* Example of using snippets directly */}
      <div className="flex gap-2">
        <button onClick={() => insertSnippet('frac')}>
          {ui("Insert Fraction")}
        </button>
        <button onClick={() => insertSnippet('sqrt')}>
          {ui("Insert Square Root")}
        </button>
        <button onClick={() => insertSnippet('sin')}>
          {ui("Insert Sine")}
        </button>
      </div>
    </div>
  );
} 