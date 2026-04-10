import { useState } from "react";
import type { QuizQuestion } from "../lib/types";

interface Props {
  questions: QuizQuestion[];
  title?: string;
}

export default function Quiz({ questions, title = "Knowledge Check" }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  const score = answers.reduce<number>(
    (acc, ans, i) => acc + (ans === questions[i].correctIndex ? 1 : 0),
    0
  );

  function select(qIndex: number, optIndex: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  }

  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="my-8 rounded-lg border border-fips-border bg-fips-surface/50 p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {questions.map((q, qi) => {
        const selected = answers[qi];
        const correct = q.correctIndex;
        const isCorrect = selected === correct;

        return (
          <div key={qi} className="mb-6 last:mb-0">
            <p className="font-medium mb-3">
              {qi + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                let style = "border-fips-border hover:border-fips-accent/40";
                if (submitted && oi === correct) {
                  style = "border-fips-green bg-fips-green/10";
                } else if (submitted && oi === selected && !isCorrect) {
                  style = "border-fips-red bg-fips-red/10";
                } else if (!submitted && oi === selected) {
                  style = "border-fips-accent bg-fips-accent/10";
                }

                return (
                  <button
                    key={oi}
                    onClick={() => select(qi, oi)}
                    className={`text-left px-4 py-2 rounded border transition-colors text-sm ${style}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className={`mt-2 text-sm ${isCorrect ? "text-fips-green" : "text-fips-red"}`}>
                {isCorrect ? "Correct!" : "Incorrect."} {q.explanation}
              </p>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button
          onClick={() => allAnswered && setSubmitted(true)}
          disabled={!allAnswered}
          className="mt-4 px-6 py-2 rounded-lg bg-fips-accent text-fips-bg font-semibold disabled:opacity-40 transition-opacity"
        >
          Check Answers
        </button>
      ) : (
        <div className="mt-4 p-3 rounded bg-fips-accent/10 text-fips-accent font-mono text-sm">
          Score: {score}/{questions.length}
        </div>
      )}
    </div>
  );
}
