import { containsTextEvaluator } from "./evaluators/contains_text.ts";
import { notContainsTextEvaluator } from "./evaluators/not_contains_text.ts";
import { maxLengthEvaluator } from "./evaluators/max_length.ts";
import { regexMatchEvaluator } from "./evaluators/regex_match.ts";
import { minLengthEvaluator } from "./evaluators/min_length.ts";
import { Evaluator } from "./types.ts";

export const evaluationRegistry: Record<string, Evaluator> = {
  contains_text: containsTextEvaluator,
  not_contains_text: notContainsTextEvaluator,
  max_length: maxLengthEvaluator,
  min_length: minLengthEvaluator,
  regex_match: regexMatchEvaluator,
};
