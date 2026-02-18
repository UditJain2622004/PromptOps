import {Evaluator} from "../types.ts"
 
export const regexMatchEvaluator: Evaluator = {
    evaluate({ outputText }, { pattern }) {
      const regex = new RegExp(pattern as string)
      const passed = regex.test(outputText)
      return {
        passed,
        details: passed
          ? `Matched regex ${pattern}`
          : `Did not match regex ${pattern}`
      }
    }
  }
  