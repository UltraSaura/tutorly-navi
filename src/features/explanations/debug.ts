export const EXPLAIN_DEBUG = {
  enableConsole: true,   // log raw AI output
  forceMock: false,      // set true to bypass AI for testing (now uses real AI)
};

export const MOCK_JSON =
  '{"steps":[{"title":"Find factors","body":"30=2×3×5, 63=3×3×7. Both share 3.","icon":"magnifier"},{"title":"Divide by 3","body":"30÷3=10, 63÷3=21.","icon":"divide"},{"title":"Check if done","body":"No more common factors.","icon":"checklist"},{"title":"Verify result","body":"10/21 cannot be simplified further.","icon":"target"}]}';