import {Evaluator} from "../types.ts"
 
export const notContainsTextEvaluator: Evaluator = {
    evaluate({ outputText }, { text }) {
        const passed = !outputText.includes(text as string)
        return {
        passed,
        details: passed
          ? `Did not find "${text}"`
          : `Found forbidden text "${text}"`
        }
    }
}
  