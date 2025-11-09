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
import type { Question, SingleQ, MultiQ, NumericQ, OrderingQ, VisualQ } from '@/types/quiz-bank';

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
  multi: false,
  segments: [
    { id: randomVisualId(), value: 0.25, label: 'Slice A', correct: true },
    { id: randomVisualId(), value: 0.25, label: 'Slice B' },
    { id: randomVisualId(), value: 0.25, label: 'Slice C', correct: true },
    { id: randomVisualId(), value: 0.25, label: 'Slice D' },
  ],
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
  const [numericAnswer, setNumericAnswer] = useState<number>(
    question && question.kind === 'numeric' ? (question as NumericQ).answer : 0
  );
  const [numericRange, setNumericRange] = useState<{ min?: number; max?: number }>(
    question && question.kind === 'numeric' ? (question as NumericQ).range || {} : {}
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
        setNumericAnswer(numQ.answer);
        setNumericRange(numQ.range || {});
      } else if (question.kind === 'ordering') {
        const ordQ = question as OrderingQ;
        setOrderingItems(ordQ.items);
        setCorrectOrder(ordQ.correctOrder);
      }
      else if (question.kind === 'visual') {
        setVisual((question as VisualQ).visual);
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
      setOrderingItems(['', '']);
      setCorrectOrder([]);
      setVisual(createDefaultVisual());
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
      if (!numericAnswer) {
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
        range: numericRange.min !== undefined || numericRange.max !== undefined ? numericRange : undefined,
      } as NumericQ;
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

          {/* Numeric Answer Editor */}
          {kind === 'numeric' && (
            <div className="space-y-2">
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
