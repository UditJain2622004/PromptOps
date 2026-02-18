import {Evaluator} from "../types.ts"
 
export const minLengthEvaluator: Evaluator = {
    evaluate({ outputText }, { min }) {
      const length = outputText.length
      const passed = length >= (min as number)
      return {
        passed,
        details: passed
          ? `Length ${length} ≥ ${min}`
          : `Length ${length} less than ${min}`
      }
    }
  }
  