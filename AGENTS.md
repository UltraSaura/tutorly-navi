# Generation rules

- Keep staging key-point instructions and examples aligned with the real pedagogical validator; provider-free tests must exercise it without rewriting provider output.
- Reject textual explanation copies, near-identical complete normalized key-point statements, and meaningless points; never infer copies from domain-token ratios or explanation subsequences, because related geometry/time facts share necessary vocabulary.
- Parse valid provider JSON verbatim before legacy cleanup so quotation marks inside lesson strings cannot corrupt otherwise valid output.
- Never repair invalid provider JSON (e.g. French decimal commas in numbers); prevent it through the staging JSON syntax rule and report the parser position and excerpt in diagnostics.