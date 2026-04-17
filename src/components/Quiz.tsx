import { useEffect, useState } from "react";
import type { QuizQuestion } from "../lib/types";
import { loadProgress, recordQuizAttempt } from "../lib/progress";

interface Props {
  questions: QuizQuestion[];
  title?: string;
  /**
   * Lesson slug this quiz belongs to. Used to persist the attempt
   * across page loads. Defaults to `location.pathname`'s last segment.
   */
  lessonSlug?: string;
}

function deriveSlug(explicit: string | undefined): string {
  if (explicit) return explicit;
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/\/lessons\/([^/]+)/);
  return m?.[1] ?? window.location.pathname;
}

export default function Quiz({ questions, title = "Knowledge Check", lessonSlug }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    new Array(questions.length).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  // Hydrate saved attempt (if any) on the client so quiz state survives
  // navigation away and back.
  useEffect(() => {
    const slug = deriveSlug(lessonSlug);
    if (!slug) return;
    const p = loadProgress();
    const prior = p.quizzes[slug];
    if (prior && prior.answers.length === questions.length) {
      setAnswers(prior.answers);
      setSubmitted(true);
    }
  }, [lessonSlug, questions.length]);

  const score = answers.reduce<number>(
    (acc, ans, i) => acc + (ans === questions[i]?.correctIndex ? 1 : 0),
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

  function submit() {
    if (!allAnswered) return;
    setSubmitted(true);
    const slug = deriveSlug(lessonSlug);
    if (slug) {
      recordQuizAttempt(slug, {
        answers: answers.map((a) => a ?? -1),
        score,
        total: questions.length,
        ts: Date.now(),
      });
    }
  }

  function tryAgain() {
    setAnswers(new Array(questions.length).fill(null));
    setSubmitted(false);
  }

  const allAnswered = answers.every((a) => a !== null);
  const passed = submitted && score === questions.length;

  return (
    <div className="quiz-card my-10 rounded-xl p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="quiz-badge" aria-hidden="true">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Quiz
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {submitted && (
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded ${
              passed ? "bg-fips-green/10 text-fips-green" : "bg-fips-accent/10 text-fips-accent"
            }`}
          >
            {passed ? "PASSED" : `${score}/${questions.length}`}
          </span>
        )}
      </div>

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
          onClick={submit}
          disabled={!allAnswered}
          className="mt-4 px-6 py-2 rounded-lg bg-fips-accent text-fips-bg font-semibold disabled:opacity-40 transition-opacity"
        >
          Check Answers
        </button>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="p-3 rounded bg-fips-accent/10 text-fips-accent font-mono text-sm">
            Score: {score}/{questions.length}
          </div>
          <button
            onClick={tryAgain}
            className="px-4 py-2 rounded-lg border border-fips-border text-fips-muted text-sm hover:text-fips-text hover:border-fips-accent/40 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
