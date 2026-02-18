import {Evaluator} from "../types.ts"
 
export const maxLengthEvaluator: Evaluator = {
    evaluate({ outputText }, { max }) {
      const length = outputText.length
      const passed = length <= (max as number)
      return {
        passed,
        details: passed
          ? `Length ${length} ≤ ${max}`
          : `Length ${length} exceeds ${max}`
      }
    }
  }
  