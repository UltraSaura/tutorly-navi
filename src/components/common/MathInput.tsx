import React, { useEffect, useRef, useState } from 'react';
import { MathfieldElement } from 'mathlive';

/** Make TS happy about the <math-field> web component in JSX */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        /** Show keyboard only when user taps the toggle */
        'virtual-keyboard-policy'?: 'manual' | 'auto' | 'sandboxed';
        placeholder?: string;
      };
    }
  }
}

type MathInputProps = {
  value?: string;
  onChange?: (latex: string) => void;
  placeholder?: string;
  className?: string;
};

const vk: any = (globalThis as any).mathVirtualKeyboard;

export default function MathInput({
  value = '',
  onChange,
  placeholder = 'Tapez une expression…',
  className = '',
}: MathInputProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [currentKeyboard, setCurrentKeyboard] = useState<'numbers' | 'functions'>('numbers');

  useEffect(() => {
    if (!vk) return;
    // Remove right-side edit toolbar
    vk.editToolbar = 'none';

    // Define the NUMBERS keyboard (first image)
    const numbersKeyboard = {
      id: 'numbers',
      label: 'Numbers',
      tooltip: 'Clavier numérique',
      displayEditToolbar: false,
      rows: [
        // Top row: constants/variables
        ['\\pi', 'e', 'i', 'x', 'y', 'z'],
        // Main keypad
        [
          '[7]', '[8]', '[9]',
          { label: '×', latex: '\\times', tooltip: 'Multiplication' },
          { label: '÷', latex: '\\div', tooltip: 'Division' },
        ],
        [
          '[4]', '[5]', '[6]',
          { label: '+', latex: '+', tooltip: 'Addition' },
          { label: '-', latex: '-', tooltip: 'Soustraction' },
        ],
        [
          '[1]', '[2]', '[3]',
          '[.]',
          { label: '⌫', class: 'action', command: 'perform-with-feedback("delete-backward")', tooltip: 'Supprimer' },
        ],
        [
          '[0]',
          { label: '◀', class: 'action small', key: 'ArrowLeft', tooltip: 'Gauche' },
          { label: '▶', class: 'action small', key: 'ArrowRight', tooltip: 'Droite' },
          { label: 'ƒ', class: 'action small', command: 'switchToFunctions', tooltip: 'Fonctions' },
          { label: '↩', class: 'action small', command: 'perform-with-feedback("commit")', tooltip: 'Valider' },
        ],
      ],
    };

    // Define the FUNCTIONS keyboard (third image)
    const functionsKeyboard = {
      id: 'functions',
      label: 'Functions',
      tooltip: 'Clavier fonctions',
      displayEditToolbar: false,
      rows: [
        // Top row: constants/variables
        ['\\pi', 'e', 'i', 'x', 'y', 'z'],
        // Main functions
        [
          { latex: '\\frac{#@}{#?}', label: 'a/b', tooltip: 'Fraction' },
          { insert: '#@^{2}', label: 'x²', tooltip: 'Carré' },
          { insert: '#@^{#?}', label: 'x^n', tooltip: 'Exposant' },
          { latex: '\\sin', label: 'sin', class: 'tex', tooltip: 'Sinus' },
          { latex: '\\sin^{-1}', label: 'sin⁻¹', class: 'tex', tooltip: 'Arc sinus' },
        ],
        [
          { latex: '\\sqrt{#0}', label: '√x', tooltip: 'Racine carrée' },
          { latex: '\\sqrt[#?]{#0}', label: 'ⁿ√x', tooltip: 'Racine nième' },
          { latex: '\\cos', label: 'cos', class: 'tex', tooltip: 'Cosinus' },
          { latex: '\\cos^{-1}', label: 'cos⁻¹', class: 'tex', tooltip: 'Arc cosinus' },
        ],
        [
          { latex: '\\log_{#?}(#0)', label: 'log_b(x)', tooltip: 'Logarithme' },
          { latex: '\\ln', label: 'ln', class: 'tex', tooltip: 'Logarithme naturel' },
          { latex: '\\tan', label: 'tan', class: 'tex', tooltip: 'Tangente' },
          { latex: '\\tan^{-1}', label: 'tan⁻¹', class: 'tex', tooltip: 'Arc tangente' },
        ],
        // Bottom row: navigation and switch
        [
          { label: '123', class: 'action', command: 'switchToNumbers', tooltip: 'Chiffres' },
          { latex: '(', tooltip: 'Parenthèse ouvrante' },
          { latex: ')', tooltip: 'Parenthèse fermante' },
          { label: '◀', class: 'action small', key: 'ArrowLeft', tooltip: 'Gauche' },
          { label: '▶', class: 'action small', key: 'ArrowRight', tooltip: 'Droite' },
          { label: '⌫', class: 'action', command: 'perform-with-feedback("delete-backward")', tooltip: 'Supprimer' },
        ],
      ],
    };

    // Set up keyboard switching functions
    const switchToNumbers = () => {
      console.log('Switching to numbers keyboard');
      setCurrentKeyboard('numbers');
      vk.layouts = [numbersKeyboard];
    };

    const switchToFunctions = () => {
      console.log('Switching to functions keyboard');
      setCurrentKeyboard('functions');
      vk.layouts = [functionsKeyboard];
    };

    // Register custom commands globally
    (globalThis as any).switchToNumbers = switchToNumbers;
    (globalThis as any).switchToFunctions = switchToFunctions;

    // Apply initial keyboard
    console.log('Applying initial keyboard:', currentKeyboard);
    if (currentKeyboard === 'numbers') {
      vk.layouts = [numbersKeyboard];
    } else {
      vk.layouts = [functionsKeyboard];
    }

    // Set up focus event to ensure keyboard is applied
    const el = ref.current as any as MathfieldElement | null;
    
    const handleFocus = () => {
      console.log('Math field focused, applying keyboard:', currentKeyboard);
      if (currentKeyboard === 'numbers') {
        vk.layouts = [numbersKeyboard];
      } else {
        vk.layouts = [functionsKeyboard];
      }
    };

    if (el) {
      el.addEventListener('focusin', handleFocus);
    }

    // Optional: adjust UI when keyboard opens/closes
    const onGeom = () => {
      // You could set bottom padding based on vk.boundingRect.height
    };
    vk.addEventListener?.('geometrychange', onGeom);

    return () => {
      if (el) {
        el.removeEventListener('focusin', handleFocus);
      }
      vk.removeEventListener?.('geometrychange', onGeom);
    };
  }, [currentKeyboard]);

  // Keep parent informed
  useEffect(() => {
    const el = ref.current as any as MathfieldElement | null;
    if (!el || !onChange) return;
    const onInput = () => onChange(el.getValue());
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [onChange]);

  return (
    <math-field
      ref={ref as any}
      className={className}
      virtual-keyboard-policy="manual"
      placeholder={placeholder}
    >
      {value}
    </math-field>
  );
} 