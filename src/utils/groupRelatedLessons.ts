// Presentation only: IDs, routes, content and progress remain independent.
const families = [
  ['Proportionnalité', 'ce93a21e-fce2-4f19-b4b8-4979afe69dc7', '9eafb0b6-8e22-4cbd-96ea-76132dc6052f', '6541505b-1af3-4978-88bf-8787d75bc300', 'bfef099e-b0cc-4e50-8522-d73e376624d5'],
  ['Aires', 'aa84cafd-a493-4d8f-95c7-c01eee7cea4b', '7be61901-cc83-4cb3-90bb-b7056c4542bc'],
  ['Angles', '4f2c6e76-bfbd-480f-b994-f54472f557bc', 'bad44ee1-7063-4d99-9875-e7cd4d2a517b'],
  ['Fractions', 'b4a3b171-08b4-4df4-9beb-804d851383ef', 'b8c901c9-839c-47e1-b416-70d833b7df01'],
  ['Solides', 'eba99c31-838a-4880-9eee-0c9a648f742e', '22dee07b-97ae-4d24-8612-27d5bd00fe38'],
  ['Résolution de problèmes', '0afc41d3-c0e1-404a-b97c-506dd3142d5a', '9d78246e-ba45-4556-bf80-a1c45058be66'],
  ['Repérage et déplacements dans l’espace', '0dae3396-adbf-4464-8fa5-48726069977b', 'ab87c5ba-201b-4870-a90b-5433e13834eb'],
];

export function groupRelatedLessons<T extends { id: string }>(topics: T[]): { key: string; label?: string; topics: T[] }[] {
  const groups: { key: string; label?: string; topics: T[] }[] = [];
  for (const topic of topics) {
    const family = families.find((entry) => entry.slice(1).includes(topic.id));
    const key = family ? `family:${family[0]}` : `topic:${topic.id}`;
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.topics.push(topic);
    else groups.push({ key, label: family?.[0], topics: [topic] });
  }
  return groups;
}
