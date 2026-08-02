import { useState, useEffect } from 'react';
import VisualQuestionBuilder from '@/components/admin/VisualQuestionBuilder';
import type { VisualUnion } from '@/lib/quiz/visual-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Plus, GripVertical } from 'lucide-react';
import type { Question, SingleQ, MultiQ, NumericQ, OrderingQ, VisualQ, OperationPoseeQ, ColumnFillQ } from '@/types/quiz-bank';
import type { SliderQuestion, MatchQuestion, FillExprQuestion } from '@/types/quiz-bank';
import { buildColumnFillQuestion } from '@/lib/quiz/columnFillBuilder';

interface QuestionEditorProps {
  question?: Question & { dbId?: string; position?: number };
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question, position: number) => void;
  position: number;
}

const randomVisualId = () => `visual-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultVisual = (): VisualUnion => ({
  subtype: 'pie',
  multi: true,
  baseCorrect: true,
  segments: [
    { id: randomVisualId(), value: 0.25, colored: true },
    { id: randomVisualId(), value: 0.25, colored: true },
    { id: randomVisualId(), value: 0.25, colored: false },
    { id: randomVisualId(), value: 0.25, colored: false },
  ],
  variants: [
    {
      id: randomVisualId(),
      segments: [
        { id: randomVisualId(), value: 0.333, colored: true },
        { id: randomVisualId(), value: 0.333, colored: false },
        { id: randomVisualId(), value: 0.333, colored: false },
      ],
      correct: false,
    }
  ]
});
export function QuestionEditor({ question, isOpen, onClose, onSave, position }: QuestionEditorProps) {
  const [kind, setKind] = useState<Question['kind']>(question?.kind || 'single');
  const [prompt, setPrompt] = useState(question?.prompt || '');
  const [hint, setHint] = useState(question?.hint || '');
  const [points, setPoints] = useState(question?.points || 1);
  const [id, setId] = useState(question?.id || `q-${Date.now()}`);

  // Single/Multi choice state
  const [choices, setChoices] = useState<Array<{ id: string; label: string; correct?: boolean }>>(
    (question && (question.kind === 'single' || question.kind === 'multi'))
      ? (question as SingleQ | MultiQ).choices
      : [{ id: 'c1', label: '', correct: false }, { id: 'c2', label: '', correct: false }]
  );

  // Numeric state
  const [answerFormat, setAnswerFormat] = useState<"number" | "fraction">(
    question && question.kind === 'numeric' ? (question as NumericQ).answerFormat || 'number' : 'number'
  );
  const [numericAnswer, setNumericAnswer] = useState<number>(
    question && question.kind === 'numeric' ? (question as NumericQ).answer : 0
  );
  const [fractionNumerator, setFractionNumerator] = useState<number>(
    question && question.kind === 'numeric' && (question as NumericQ).fractionAnswer
      ? (question as NumericQ).fractionAnswer!.numerator : 1
  );
  const [fractionDenominator, setFractionDenominator] = useState<number>(
    question && question.kind === 'numeric' && (question as NumericQ).fractionAnswer
      ? (question as NumericQ).fractionAnswer!.denominator : 2
  );
  const [numericRange, setNumericRange] = useState<{ min?: number; max?: number }>(
    question && question.kind === 'numeric' ? (question as NumericQ).range || {} : {}
  );
  const [dragOptions, setDragOptions] = useState<number[]>(
    question && question.kind === 'numeric' && (question as NumericQ).dragOptions
      ? (question as NumericQ).dragOptions! : []
  );

  // Ordering state
  const [orderingItems, setOrderingItems] = useState<string[]>(
    question && question.kind === 'ordering'
      ? (question as OrderingQ).items
      : ['', '']
  );
  const [correctOrder, setCorrectOrder] = useState<string[]>(
    question && question.kind === 'ordering'
      ? (question as OrderingQ).correctOrder
      : []
  );

  const [visual, setVisual] = useState<VisualUnion>(
    question && question.kind === 'visual'
      ? (question as VisualQ).visual
      : createDefaultVisual()
  );
  const [operation, setOperation] = useState<'addition' | 'subtraction'>(
    question && question.kind === 'operation-posee' ? (question as OperationPoseeQ).operation : 'subtraction'
  );
  const [topNumber, setTopNumber] = useState<number>(
    question && question.kind === 'operation-posee' ? (question as OperationPoseeQ).topNumber : 325
  );
  const [bottomNumber, setBottomNumber] = useState<number>(
    question && question.kind === 'operation-posee' ? (question as OperationPoseeQ).bottomNumber : 148
  );
  const [poseeLocale, setPoseeLocale] = useState<'fr' | 'en'>(
    question && question.kind === 'operation-posee' ? ((question as OperationPoseeQ).locale || 'fr') : 'fr'
  );
  const [columnFillOperation, setColumnFillOperation] = useState<ColumnFillQ['operation']>(
    question?.kind === 'column-fill' ? question.operation : 'addition'
  );
  const [columnFirstOperand, setColumnFirstOperand] = useState<number>(
    question?.kind === 'column-fill' ? Number(question.operands[0] ?? 0) : 29
  );
  const [columnSecondOperand, setColumnSecondOperand] = useState<number>(
    question?.kind === 'column-fill' ? Number(question.operands[1] ?? 0) : 66
  );
  const [columnInstructions, setColumnInstructions] = useState<string>(
    question?.kind === 'column-fill' ? (question.instructions ?? '') : ''
  );

  // Slider state
  const [sliderMin, setSliderMin] = useState<number>(
    question?.kind === 'slider' ? question.min : 0);
  const [sliderMax, setSliderMax] = useState<number>(
    question?.kind === 'slider' ? question.max : 100);
  const [sliderStep, setSliderStep] = useState<number>(
    question?.kind === 'slider' ? question.step : 1);
  const [sliderAnswer, setSliderAnswer] = useState<number>(
    question?.kind === 'slider' ? question.answer : 50);
  const [sliderTolerance, setSliderTolerance] = useState<number>(
    question?.kind === 'slider' ? question.tolerance : 2);
  const [sliderUnit, setSliderUnit] = useState<string>(
    question?.kind === 'slider' ? (question.unit ?? '') : '');
  const [sliderTrackLabel, setSliderTrackLabel] = useState<string>(
    question?.kind === 'slider' ? (question.trackLabel ?? '') : '');

  // Match state
  const [matchPairs, setMatchPairs] = useState<Array<{leftId:string;left:string;rightId:string;right:string}>>(
    question?.kind === 'match' ? question.pairs : [
      { leftId: 'l1', left: '', rightId: 'r1', right: '' },
      { leftId: 'l2', left: '', rightId: 'r2', right: '' },
    ]);
  const [matchHideLabels, setMatchHideLabels] = useState<boolean>(
    question?.kind === 'match' ? (question.hide_labels ?? false) : false);

  // Fill-expr state
  const [fillTemplate, setFillTemplate] = useState<string>(
    question?.kind === 'fill-expr' ? question.template : '__ + __ = __');
  const [fillBlanks, setFillBlanks] = useState<string>(
    question?.kind === 'fill-expr' ? question.blanks.join(',') : 'b1,b2');
  const [fillChips, setFillChips] = useState<string>(
    question?.kind === 'fill-expr' ? question.chips.join(',') : '');
  const [fillAnswers, setFillAnswers] = useState<string>(
    question?.kind === 'fill-expr' ? JSON.stringify(question.answers) : '{"b1":"","b2":""}');

  useEffect(() => {
    if (question) {
      setKind(question.kind);
      setPrompt(question.prompt);
      setHint(question.hint || '');
      setPoints(question.points || 1);
      setId(question.id);

      if (question.kind === 'single' || question.kind === 'multi') {
        setChoices((question as SingleQ | MultiQ).choices);
      } else if (question.kind === 'numeric') {
        const numQ = question as NumericQ;
        setAnswerFormat(numQ.answerFormat || 'number');
        setNumericAnswer(numQ.answer);
        setNumericRange(numQ.range || {});
        setFractionNumerator(numQ.fractionAnswer?.numerator ?? 1);
        setFractionDenominator(numQ.fractionAnswer?.denominator ?? 2);
        setDragOptions(numQ.dragOptions ?? []);
      } else if (question.kind === 'ordering') {
        const ordQ = question as OrderingQ;
        setOrderingItems(ordQ.items);
        setCorrectOrder(ordQ.correctOrder);
      }
      else if (question.kind === 'visual') {
        setVisual((question as VisualQ).visual);
      } else if (question.kind === 'operation-posee') {
        const poseeQ = question as OperationPoseeQ;
        setOperation(poseeQ.operation);
        setTopNumber(poseeQ.topNumber);
        setBottomNumber(poseeQ.bottomNumber);
        setPoseeLocale(poseeQ.locale || 'fr');
      } else if (question.kind === 'column-fill') {
        setColumnFillOperation(question.operation);
        setColumnFirstOperand(Number(question.operands[0] ?? 0));
        setColumnSecondOperand(Number(question.operands[1] ?? 0));
        setColumnInstructions(question.instructions ?? '');
      } else if (question.kind === 'slider') {
        setSliderMin(question.min);
        setSliderMax(question.max);
        setSliderStep(question.step);
        setSliderAnswer(question.answer);
        setSliderTolerance(question.tolerance);
        setSliderUnit(question.unit ?? '');
        setSliderTrackLabel(question.trackLabel ?? '');
      } else if (question.kind === 'match') {
        setMatchPairs(question.pairs);
        setMatchHideLabels(question.hide_labels ?? false);
      } else if (question.kind === 'fill-expr') {
        setFillTemplate(question.template);
        setFillBlanks(question.blanks.join(','));
        setFillChips(question.chips.join(','));
        setFillAnswers(JSON.stringify(question.answers));
      }
    } else {
      // Reset for new question
      setKind('single');
      setPrompt('');
      setHint('');
      setPoints(1);
      setId(`q-${Date.now()}`);
      setChoices([{ id: 'c1', label: '', correct: false }, { id: 'c2', label: '', correct: false }]);
      setNumericAnswer(0);
      setNumericRange({});
      setAnswerFormat('number');
      setFractionNumerator(1);
      setFractionDenominator(2);
      setDragOptions([]);
      setOrderingItems(['', '']);
      setCorrectOrder([]);
      setVisual(createDefaultVisual());
      setOperation('subtraction');
      setTopNumber(325);
      setBottomNumber(148);
      setPoseeLocale('fr');
      setColumnFillOperation('addition');
      setColumnFirstOperand(29);
      setColumnSecondOperand(66);
      setColumnInstructions('');
      setSliderMin(0);
      setSliderMax(100);
      setSliderStep(1);
      setSliderAnswer(50);
      setSliderTolerance(2);
      setSliderUnit('');
      setSliderTrackLabel('');
      setMatchPairs([
        { leftId: 'l1', left: '', rightId: 'r1', right: '' },
        { leftId: 'l2', left: '', rightId: 'r2', right: '' },
      ]);
      setMatchHideLabels(false);
      setFillTemplate('__ + __ = __');
      setFillBlanks('b1,b2');
      setFillChips('');
      setFillAnswers('{"b1":"","b2":""}');
    }
  }, [question, isOpen]);

  const handleAddChoice = () => {
    setChoices([...choices, { id: `c${Date.now()}`, label: '', correct: false }]);
  };

  const handleRemoveChoice = (choiceId: string) => {
    if (choices.length > 2) {
      setChoices(choices.filter(c => c.id !== choiceId));
    }
  };

  const handleChoiceChange = (choiceId: string, field: 'label' | 'correct', value: string | boolean) => {
    setChoices(choices.map(c =>
      c.id === choiceId ? { ...c, [field]: value } : c
    ));
  };

  const handleAddOrderingItem = () => {
    const newItems = [...orderingItems, ''];
    setOrderingItems(newItems);
    // Initialize correct order if empty
    if (correctOrder.length === 0) {
      setCorrectOrder([...newItems.filter(i => i.trim())]);
    }
  };

  const handleRemoveOrderingItem = (index: number) => {
    if (orderingItems.length > 2) {
      const oldValue = orderingItems[index];
      const newItems = orderingItems.filter((_, i) => i !== index);
      setOrderingItems(newItems);
      setCorrectOrder(correctOrder.filter(item => item !== oldValue && newItems.includes(item)));
    }
  };

  const handleOrderingItemChange = (index: number, value: string) => {
    const oldValue = orderingItems[index];
    const newItems = [...orderingItems];
    newItems[index] = value;
    setOrderingItems(newItems);
    
    // Update correct order if it contains the old value
    if (correctOrder.includes(oldValue)) {
      setCorrectOrder(correctOrder.map(item => item === oldValue ? value : item));
    } else if (value.trim() && correctOrder.length < newItems.filter(i => i.trim()).length) {
      // If correct order is not initialized, set it
      if (correctOrder.length === 0) {
        setCorrectOrder([...newItems.filter(i => i.trim())]);
      }
    }
  };

  const handleSave = () => {
    if (!prompt.trim()) {
      alert('Please enter a question prompt');
      return;
    }

    let questionData: Question;

    if (kind === 'single' || kind === 'multi') {
      const validChoices = choices.filter(c => c.label.trim());
      if (validChoices.length < 2) {
        alert('Please add at least 2 choices');
        return;
      }
      const hasCorrect = validChoices.some(c => c.correct);
      if (!hasCorrect) {
        alert('Please mark at least one choice as correct');
        return;
      }
      questionData = {
        id,
        kind,
        prompt,
        hint: hint || undefined,
        points,
        choices: validChoices,
      } as SingleQ | MultiQ;
    } else if (kind === 'numeric') {
      if (answerFormat === 'fraction') {
        if (!fractionDenominator) {
          alert('Denominator cannot be zero');
          return;
        }
        questionData = {
          id,
          kind: 'numeric',
          prompt,
          hint: hint || undefined,
          points,
          answer: 0,
          answerFormat: 'fraction',
          fractionAnswer: { numerator: fractionNumerator, denominator: fractionDenominator },
          dragOptions: dragOptions.length > 0 ? dragOptions : undefined,
        } as NumericQ;
      } else {
        if (!numericAnswer && numericAnswer !== 0) {
          alert('Please enter a correct answer');
          return;
        }
        questionData = {
          id,
          kind: 'numeric',
          prompt,
          hint: hint || undefined,
          points,
          answer: numericAnswer,
          answerFormat: 'number',
          range: numericRange.min !== undefined || numericRange.max !== undefined ? numericRange : undefined,
        } as NumericQ;
      }
    } else if (kind === 'ordering') {
      const validItems = orderingItems.filter(i => i.trim());
      if (validItems.length < 2) {
        alert('Please add at least 2 items');
        return;
      }
      if (correctOrder.length !== validItems.length) {
        alert('Please set the correct order for all items');
        return;
      }
      questionData = {
        id,
        kind: 'ordering',
        prompt,
        hint: hint || undefined,
        points,
        items: validItems,
        correctOrder,
      } as OrderingQ;
    } else if (kind === 'visual') {
      questionData = {
        id,
        kind: 'visual',
        prompt,
        hint: hint || undefined,
        points,
        visual,
      } as VisualQ;
    } else if (kind === 'operation-posee') {
      if (!Number.isFinite(topNumber) || !Number.isFinite(bottomNumber)) {
        alert('Please enter valid numbers for top and bottom values');
        return;
      }
      questionData = {
        id,
        kind: 'operation-posee',
        prompt,
        hint: hint || undefined,
        points,
        operation,
        topNumber: Math.trunc(topNumber),
        bottomNumber: Math.trunc(bottomNumber),
        locale: poseeLocale,
      } as OperationPoseeQ;
    } else if (kind === 'column-fill') {
      if (!Number.isFinite(columnFirstOperand) || !Number.isFinite(columnSecondOperand)) {
        alert('Please enter valid numbers for the column method exercise');
        return;
      }
      if (columnFillOperation === 'multiplication' && String(Math.abs(Math.trunc(columnSecondOperand))).length > 1) {
        alert('Phase 1 multiplication supports a one-digit multiplier only.');
        return;
      }
      if (columnFillOperation === 'division' && Math.trunc(columnSecondOperand) === 0) {
        alert('Division by zero is not allowed.');
        return;
      }
      questionData = buildColumnFillQuestion({
        id,
        prompt,
        hint: hint || undefined,
        points,
        operation: columnFillOperation,
        firstOperand: Math.trunc(columnFirstOperand),
        secondOperand: Math.trunc(columnSecondOperand),
        locale: 'fr',
        instructions: columnInstructions || undefined,
      });
    } else if (kind === 'slider') {
      questionData = {
        id, kind: 'slider', prompt, hint: hint || undefined,
        points, min: sliderMin, max: sliderMax, step: sliderStep,
        answer: sliderAnswer, tolerance: sliderTolerance,
        unit: sliderUnit || undefined,
        trackLabel: sliderTrackLabel || undefined,
      } satisfies SliderQuestion;
    } else if (kind === 'match') {
      questionData = {
        id, kind: 'match', prompt, hint: hint || undefined,
        points, pairs: matchPairs,
        hide_labels: matchHideLabels || undefined,
      } satisfies MatchQuestion;
    } else if (kind === 'fill-expr') {
      const blanksArr = fillBlanks.split(',').map(s => s.trim()).filter(Boolean);
      const chipsArr = fillChips.split(',').map(s => s.trim()).filter(Boolean);
      let answersObj: Record<string,string> = {};
      try { answersObj = JSON.parse(fillAnswers); } catch {}
      questionData = {
        id, kind: 'fill-expr', prompt, hint: hint || undefined,
        points, template: fillTemplate,
        blanks: blanksArr, chips: chipsArr, answers: answersObj,
      } satisfies FillExprQuestion;
    } else {
      alert('Unsupported question type');
      return;
    }

    onSave(questionData, position);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="kind">Question Type</Label>
            <Select value={kind} onValueChange={(value: Question['kind']) => setKind(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Choice</SelectItem>
                <SelectItem value="multi">Multiple Choice</SelectItem>
                <SelectItem value="numeric">Numeric Answer</SelectItem>
                <SelectItem value="ordering">Ordering</SelectItem>
                <SelectItem value="visual">Visual</SelectItem>
                <SelectItem value="operation-posee">Pose et calcule</SelectItem>
                <SelectItem value="column-fill">Méthode en colonnes</SelectItem>
                <SelectItem value="slider">Slider</SelectItem>
                <SelectItem value="match">Associer (Match)</SelectItem>
                <SelectItem value="fill-expr">Compléter l'expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="id">Question ID</Label>
            <Input
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Unique identifier"
              disabled={!!question}
            />
          </div>

          <div>
            <Label htmlFor="prompt">Question Prompt</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the question text"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="hint">Hint (optional)</Label>
            <Textarea
              id="hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Optional hint for students"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="points">Points</Label>
            <Input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>

          {/* Single/Multi Choice Editor */}
          {(kind === 'single' || kind === 'multi') && (
            <div className="space-y-2">
              <Label>Choices</Label>
              {choices.map((choice, index) => (
                <div key={choice.id} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={choice.label}
                    onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                    placeholder={`Choice ${index + 1}`}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={choice.correct || false}
                      onChange={(e) => handleChoiceChange(choice.id, 'correct', e.target.checked)}
                      className="rounded"
                    />
                    <Label className="text-sm">Correct</Label>
                  </div>
                  {choices.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveChoice(choice.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddChoice}>
                <Plus className="w-4 h-4 mr-2" />
                Add Choice
              </Button>
            </div>
          )}

          {kind === 'numeric' && (
            <div className="space-y-2">
              <div>
                <Label>Answer Format</Label>
                <Select value={answerFormat} onValueChange={(v: "number" | "fraction") => setAnswerFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="fraction">Fraction</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {answerFormat === 'number' && (
                <>
                  <div>
                    <Label htmlFor="numeric-answer">Correct Answer</Label>
                    <Input
                      id="numeric-answer"
                      type="number"
                      value={numericAnswer}
                      onChange={(e) => setNumericAnswer(parseFloat(e.target.value) || 0)}
                      step="any"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="numeric-min">Min Value (optional)</Label>
                      <Input
                        id="numeric-min"
                        type="number"
                        value={numericRange.min || ''}
                        onChange={(e) => setNumericRange({ ...numericRange, min: e.target.value ? parseFloat(e.target.value) : undefined })}
                        step="any"
                      />
                    </div>
                    <div>
                      <Label htmlFor="numeric-max">Max Value (optional)</Label>
                      <Input
                        id="numeric-max"
                        type="number"
                        value={numericRange.max || ''}
                        onChange={(e) => setNumericRange({ ...numericRange, max: e.target.value ? parseFloat(e.target.value) : undefined })}
                        step="any"
                      />
                    </div>
                  </div>
                </>
              )}

              {answerFormat === 'fraction' && (
                <div className="space-y-3">
                  <Label>Correct Fraction</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0">
                      <Input
                        type="number"
                        className="w-20 text-center"
                        value={fractionNumerator}
                        onChange={(e) => setFractionNumerator(parseInt(e.target.value) || 0)}
                        placeholder="Num"
                      />
                      <div className="w-20 h-[2px] bg-foreground my-1" />
                      <Input
                        type="number"
                        className="w-20 text-center"
                        value={fractionDenominator}
                        onChange={(e) => setFractionDenominator(parseInt(e.target.value) || 0)}
                        placeholder="Den"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      = {fractionNumerator}/{fractionDenominator}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Any equivalent fraction will be accepted (e.g., 2/6 for 1/3).
                  </p>

                  {/* Drag Options */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label>Number Chips (drag & drop options for students)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nums = new Set<number>();
                          const n = fractionNumerator;
                          const d = fractionDenominator;
                          nums.add(Math.abs(n));
                          nums.add(Math.abs(d));
                          if (Math.abs(n) > 1) nums.add(Math.abs(n) - 1);
                          nums.add(Math.abs(n) + 1);
                          if (Math.abs(d) > 1) nums.add(Math.abs(d) - 1);
                          nums.add(Math.abs(d) + 1);
                          nums.add(Math.abs(n) * 2);
                          nums.add(Math.abs(d) * 2);
                          // Add a random small number
                          for (let i = 1; i <= 10; i++) {
                            if (nums.size >= 8) break;
                            nums.add(i);
                          }
                          nums.delete(0);
                          const sorted = Array.from(nums).sort((a, b) => a - b);
                          setDragOptions(sorted);
                        }}
                      >
                        Auto-generate
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dragOptions.map((num, i) => (
                        <div
                          key={`${num}-${i}`}
                          className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-lg text-sm"
                        >
                          <span>{num}</span>
                          <button
                            type="button"
                            onClick={() => setDragOptions(dragOptions.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Add number"
                        className="w-28"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = parseInt((e.target as HTMLInputElement).value);
                            if (!isNaN(val) && !dragOptions.includes(val)) {
                              setDragOptions([...dragOptions, val].sort((a, b) => a - b));
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <p className="text-xs text-muted-foreground self-center">Press Enter to add</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ordering Editor */}
          {kind === 'ordering' && (
            <div className="space-y-2">
              <Label>Items to Order</Label>
              {orderingItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input
                    value={item}
                    onChange={(e) => handleOrderingItemChange(index, e.target.value)}
                    placeholder={`Item ${index + 1}`}
                  />
                  {orderingItems.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOrderingItem(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddOrderingItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>

              <div className="mt-4">
                <Label>Correct Order (reorder using arrows or set current order)</Label>
                <div className="space-y-2 mt-2">
                  {(correctOrder.length > 0 ? correctOrder : orderingItems.filter(i => i.trim())).map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input value={item} disabled />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const currentOrder = correctOrder.length > 0 ? correctOrder : orderingItems.filter(i => i.trim());
                          if (index > 0) {
                            const newOrder = [...currentOrder];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            setCorrectOrder(newOrder);
                          }
                        }}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const currentOrder = correctOrder.length > 0 ? correctOrder : orderingItems.filter(i => i.trim());
                          if (index < currentOrder.length - 1) {
                            const newOrder = [...currentOrder];
                            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                            setCorrectOrder(newOrder);
                          }
                        }}
                        disabled={index === (correctOrder.length > 0 ? correctOrder : orderingItems.filter(i => i.trim())).length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setCorrectOrder([...orderingItems.filter(i => i.trim())])}
                >
                  Set Current Order as Correct
                </Button>
              </div>
            </div>
          )}

          {kind === 'visual' && (
            <div className="space-y-2">
              <Label className="text-sm">Visual configuration</Label>
              <VisualQuestionBuilder value={visual} onChange={setVisual} />
            </div>
          )}

          {kind === 'operation-posee' && (
            <div className="space-y-3">
              <div>
                <Label>Operation</Label>
                <Select value={operation} onValueChange={(value: 'addition' | 'subtraction') => setOperation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition (+)</SelectItem>
                    <SelectItem value="subtraction">Subtraction (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="posee-top-number">Top number</Label>
                  <Input
                    id="posee-top-number"
                    type="number"
                    value={topNumber}
                    onChange={(e) => setTopNumber(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="posee-bottom-number">Bottom number</Label>
                  <Input
                    id="posee-bottom-number"
                    type="number"
                    value={bottomNumber}
                    onChange={(e) => setBottomNumber(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
              <div>
                <Label>Locale</Label>
                <Select value={poseeLocale} onValueChange={(value: 'fr' | 'en') => setPoseeLocale(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {kind === 'column-fill' && (
            <div className="space-y-3">
              <div>
                <Label>Operation</Label>
                <Select value={columnFillOperation} onValueChange={(value: ColumnFillQ['operation']) => setColumnFillOperation(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition</SelectItem>
                    <SelectItem value="subtraction">Soustraction</SelectItem>
                    <SelectItem value="multiplication">Multiplication</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{columnFillOperation === 'division' ? 'Dividende' : 'Premier nombre'}</Label>
                  <Input
                    type="number"
                    value={columnFirstOperand}
                    onChange={(e) => setColumnFirstOperand(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div>
                  <Label>{columnFillOperation === 'division' ? 'Diviseur' : 'Deuxième nombre'}</Label>
                  <Input
                    type="number"
                    value={columnSecondOperand}
                    onChange={(e) => setColumnSecondOperand(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>

              <div>
                <Label>Instruction affichée à l'élève (optionnel)</Label>
                <Textarea
                  value={columnInstructions}
                  onChange={(e) => setColumnInstructions(e.target.value)}
                  rows={2}
                  placeholder="ex: Complète les retenues et le résultat."
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Phase 1: addition, soustraction, multiplication à un chiffre, division avec quotient et reste.
              </p>
            </div>
          )}

          {kind === 'slider' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Min</Label>
                  <Input type="number" value={sliderMin} onChange={e => setSliderMin(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Max</Label>
                  <Input type="number" value={sliderMax} onChange={e => setSliderMax(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Step</Label>
                  <Input type="number" value={sliderStep} onChange={e => setSliderStep(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Réponse correcte</Label>
                  <Input type="number" value={sliderAnswer} onChange={e => setSliderAnswer(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Tolérance (±)</Label>
                  <Input type="number" value={sliderTolerance} onChange={e => setSliderTolerance(Number(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Unité (optionnel)</Label>
                  <Input value={sliderUnit} onChange={e => setSliderUnit(e.target.value)} placeholder="ex: °C, km, %" />
                </div>
                <div>
                  <Label>Label (optionnel)</Label>
                  <Input value={sliderTrackLabel} onChange={e => setSliderTrackLabel(e.target.value)} placeholder="ex: Choisis une valeur" />
                </div>
              </div>
            </div>
          )}

          {kind === 'match' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Paires (gauche ↔ droite)</Label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={matchHideLabels}
                    onChange={e => setMatchHideLabels(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-muted-foreground">
                    Masquer les fractions <span className="text-xs">(pie uniquement)</span>
                  </span>
                </label>
              </div>
              {matchHideLabels && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg px-3 py-2">
                  Les textes de fraction (ex: "1/2") seront cachés côté étudiant — seul le diagramme circulaire sera visible. Parfait pour les exercices "Compte les parts".
                </p>
              )}
              {matchPairs.map((pair, i) => (
                <div key={pair.leftId} className="flex gap-2 items-center">
                  <Input
                    value={pair.left}
                    onChange={e => setMatchPairs(prev => prev.map((p,j) => j===i ? {...p, left: e.target.value} : p))}
                    placeholder="Gauche"
                  />
                  <span className="text-muted-foreground">↔</span>
                  <Input
                    value={pair.right}
                    onChange={e => setMatchPairs(prev => prev.map((p,j) => j===i ? {...p, right: e.target.value} : p))}
                    placeholder="Droite"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setMatchPairs(prev => prev.filter((_,j) => j!==i))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMatchPairs(prev => [...prev, {
                leftId: `l${Date.now()}`, left: '',
                rightId: `r${Date.now()}`, right: ''
              }])}>
                <Plus className="w-4 h-4 mr-1" /> Ajouter une paire
              </Button>
            </div>
          )}

          {kind === 'fill-expr' && (
            <div className="space-y-3">
              <div>
                <Label>Template (utilise __ pour les blancs)</Label>
                <Input value={fillTemplate} onChange={e => setFillTemplate(e.target.value)} placeholder="ex: 3 × __ = __" />
              </div>
              <div>
                <Label>IDs des blancs (séparés par virgule)</Label>
                <Input value={fillBlanks} onChange={e => setFillBlanks(e.target.value)} placeholder="ex: b1,b2" />
              </div>
              <div>
                <Label>Chips disponibles (séparés par virgule)</Label>
                <Input value={fillChips} onChange={e => setFillChips(e.target.value)} placeholder="ex: 4,6,12,9" />
              </div>
              <div>
                <Label>Réponses correctes (JSON)</Label>
                <Textarea value={fillAnswers} onChange={e => setFillAnswers(e.target.value)}
                  placeholder={'{"b1":"4","b2":"12"}'} className="font-mono text-xs" rows={3} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {question ? 'Update' : 'Add'} Question
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
