/** Standalone demo entry: no app router, authentication, or database. */
import { createRoot } from 'react-dom/client';
import ExplanationV2MathLab from '@/pages/dev/ExplanationV2MathLab';
import '@/index.css';

const element = document.getElementById('root');
if (!element) throw new Error('Missing demo root');
createRoot(element).render(<ExplanationV2MathLab />);
