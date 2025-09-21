"use client";

import React, { useState, useEffect } from "react";
import QuestionComponent from "./Question";
import { Question, QuestionResponse } from "@/types/question";
import { SCORMAPIImplementation } from "@/lib/scorm-api";

interface SCORMQuestionProps {
  questions: Question[];
  scormAPI?: SCORMAPIImplementation;
  version?: "1.2" | "2004";
  onComplete?: (responses: QuestionResponse[]) => void;
}

export default function SCORMQuestion({
  questions,
  scormAPI,
  version = "1.2",
  onComplete,
}: SCORMQuestionProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const currentResponse = responses.find(
    (r) => r.questionId === currentQuestion?.id
  );

  // Initialize SCORM session
  useEffect(() => {
    if (scormAPI) {
      try {
        const initResult =
          version === "1.2"
            ? scormAPI.LMSInitialize("")
            : scormAPI.Initialize("");

        if (initResult === "true") {
          console.log("[SCORMQuestion] SCORM session initialized");

          // Set lesson status to incomplete
          const statusKey =
            version === "1.2"
              ? "cmi.core.lesson_status"
              : "cmi.completion_status";
          const setValueMethod = version === "1.2" ? "LMSSetValue" : "SetValue";
          scormAPI[setValueMethod](statusKey, "incomplete");
        }
      } catch (error) {
        console.error("[SCORMQuestion] Failed to initialize SCORM:", error);
      }
    }
  }, [scormAPI, version]);

  const handleAnswer = (response: QuestionResponse) => {
    console.log("[SCORMQuestion] Answer received:", response);

    // Store response locally
    setResponses((prev) => {
      const filtered = prev.filter((r) => r.questionId !== response.questionId);
      return [...filtered, response];
    });

    // Send to SCORM API if available
    if (scormAPI) {
      try {
        const questionIndex = questions.findIndex(
          (q) => q.id === response.questionId
        );

        if (version === "1.2") {
          // SCORM 1.2 interaction tracking
          scormAPI.LMSSetValue(
            `cmi.interactions.${questionIndex}.id`,
            response.questionId
          );
          scormAPI.LMSSetValue(
            `cmi.interactions.${questionIndex}.student_response`,
            String(response.userAnswer)
          );
          scormAPI.LMSSetValue(
            `cmi.interactions.${questionIndex}.result`,
            response.isCorrect ? "correct" : "incorrect"
          );
          scormAPI.LMSSetValue(
            `cmi.interactions.${questionIndex}.time`,
            new Date().toISOString()
          );

          // Set question type
          const question = questions.find((q) => q.id === response.questionId);
          if (question) {
            let scormType = "choice";
            if (question.type === "QUESTION_TYPE_NUMERIC")
              scormType = "numeric";
            else if (question.type === "QUESTION_TYPE_TF")
              scormType = "true-false";

            scormAPI.LMSSetValue(
              `cmi.interactions.${questionIndex}.type`,
              scormType
            );
          }
        } else {
          // SCORM 2004 interaction tracking
          scormAPI.SetValue(
            `cmi.interactions.${questionIndex}.id`,
            response.questionId
          );
          scormAPI.SetValue(
            `cmi.interactions.${questionIndex}.learner_response`,
            String(response.userAnswer)
          );
          scormAPI.SetValue(
            `cmi.interactions.${questionIndex}.result`,
            response.isCorrect ? "correct" : "incorrect"
          );
          scormAPI.SetValue(
            `cmi.interactions.${questionIndex}.timestamp`,
            new Date().toISOString()
          );

          const question = questions.find((q) => q.id === response.questionId);
          if (question) {
            let scormType = "choice";
            if (question.type === "QUESTION_TYPE_NUMERIC")
              scormType = "numeric";
            else if (question.type === "QUESTION_TYPE_TF")
              scormType = "true-false";

            scormAPI.SetValue(
              `cmi.interactions.${questionIndex}.type`,
              scormType
            );
          }
        }

        // Commit the data
        const commitResult =
          version === "1.2" ? scormAPI.LMSCommit("") : scormAPI.Commit("");
        console.log("[SCORMQuestion] SCORM commit result:", commitResult);
      } catch (error) {
        console.error("[SCORMQuestion] Failed to send data to SCORM:", error);
      }
    }

    // Auto-advance or complete
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        completeQuiz();
      }
    }, 1500);
  };

  const completeQuiz = () => {
    setIsComplete(true);

    // Calculate final score
    const allResponses = [...responses];
    const correctCount = allResponses.filter((r) => r.isCorrect).length;
    const totalCount = questions.length;
    const scorePercent = Math.round((correctCount / totalCount) * 100);

    // Update SCORM with final results
    if (scormAPI) {
      try {
        if (version === "1.2") {
          scormAPI.LMSSetValue("cmi.core.score.raw", String(scorePercent));
          scormAPI.LMSSetValue("cmi.core.score.max", "100");
          scormAPI.LMSSetValue("cmi.core.score.min", "0");
          scormAPI.LMSSetValue(
            "cmi.core.lesson_status",
            scorePercent >= 80 ? "passed" : "failed"
          );
        } else {
          scormAPI.SetValue("cmi.score.raw", String(scorePercent));
          scormAPI.SetValue("cmi.score.max", "100");
          scormAPI.SetValue("cmi.score.min", "0");
          scormAPI.SetValue(
            "cmi.success_status",
            scorePercent >= 80 ? "passed" : "failed"
          );
          scormAPI.SetValue("cmi.completion_status", "completed");
        }

        const commitResult =
          version === "1.2" ? scormAPI.LMSCommit("") : scormAPI.Commit("");
        console.log("[SCORMQuestion] Final SCORM commit result:", commitResult);
      } catch (error) {
        console.error(
          "[SCORMQuestion] Failed to send final results to SCORM:",
          error
        );
      }
    }

    // Notify parent component
    if (onComplete) {
      onComplete(allResponses);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No questions available</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = responses.filter((r) => r.isCorrect).length;
    const totalCount = responses.length;
    const scorePercent = Math.round((correctCount / totalCount) * 100);

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Assessment Complete!
          </h2>
          <div className="text-4xl font-bold mb-4">
            <span
              className={scorePercent >= 80 ? "text-green-600" : "text-red-600"}
            >
              {scorePercent}%
            </span>
          </div>
          <p className="text-gray-600 mb-4">
            You answered {correctCount} out of {totalCount} questions correctly
          </p>
          <p
            className={`font-medium mb-6 ${
              scorePercent >= 80 ? "text-green-600" : "text-red-600"
            }`}
          >
            {scorePercent >= 80 ? "PASSED" : "FAILED"}
          </p>

          {scormAPI && (
            <div className="text-sm text-gray-500 mb-4">
              Results have been saved to your learning management system.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-gray-900">SCORM Assessment</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            {scormAPI && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                SCORM Connected
              </span>
            )}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 origin-left"
            style={
              {
                "--progress": `${
                  (currentQuestionIndex + 1) / questions.length
                }`,
                transform: "scaleX(var(--progress))",
              } as React.CSSProperties
            }
          />
        </div>
      </div>

      {/* Question Component */}
      <QuestionComponent
        question={currentQuestion}
        onAnswer={handleAnswer}
        showCorrectAnswer={!!currentResponse}
        userAnswer={currentResponse?.userAnswer}
      />

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={currentQuestionIndex === questions.length - 1}
          className="flex items-center px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <svg
            className="w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
