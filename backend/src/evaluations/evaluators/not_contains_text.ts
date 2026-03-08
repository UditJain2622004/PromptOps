import {Evaluator} from "../types.ts"
 
export const notContainsTextEvaluator: Evaluator = {
    evaluate({ outputText }, { text }) {
      // lowercase the output text and the text to be compared
      const outputTextLower = outputText.toLowerCase()
      const textLower = (text as string).toLowerCase()
      const passed = !outputTextLower.includes(textLower)
        return {
        passed,
        details: passed
          ? `Did not find "${text}"`
          : `Found forbidden text "${text}"`
        }
    }
}
  