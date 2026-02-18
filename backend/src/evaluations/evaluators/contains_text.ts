import {Evaluator} from "../types.ts"
 
export const containsTextEvaluator: Evaluator = {
    evaluate({ outputText }, { text }) {
      const passed = outputText.includes(text as string)
      return {
        passed,
        details: passed
          ? `Found "${text}"`
          : `Did not find "${text}"`
      }
    }
  }
  