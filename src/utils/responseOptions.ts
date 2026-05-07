import { Message } from '@/types/chat';

export const TRUE_FALSE_CHOICES = ['Vrai', 'Faux'];

export function getExerciseChoices(message: Pick<Message, 'responseType' | 'choices'>): string[] {
  if (message.responseType === 'true_false') {
    return message.choices?.length ? message.choices : TRUE_FALSE_CHOICES;
  }

  return message.choices || [];
}
