export const COUNTABLE_OBJECTS = ['pencil', 'apple', 'book', 'star'] as const;
export type CountableObject = typeof COUNTABLE_OBJECTS[number];
