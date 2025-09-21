"use client";

import React, { useState } from "react";
import QuestionComponent from "./Question";
import { Question, QuestionResponse } from "@/types/question";

// Sample questions based on your SCORM data
const sampleQuestions: Question[] = [
  {
    id: "com.scorm.golfsamples.interactions.playing_1",
    text: "The rules of golf are maintained by:'?",
    type: "QUESTION_TYPE_CHOICE",
    choices: [
      "The UN",
      "USGA and Royal and Ancient",
      "The PGA",
      "Each course has it's own rules",
    ],
    correctAnswer: "USGA and Royal and Ancient",
    objective: "obj_playing",
  },
  {
    id: "com.scorm.golfsamples.interactions.playing_2",
    text: "A score of two under par on a given hole is known as a(n):",
    type: "QUESTION_TYPE_CHOICE",
    choices: ["opportity for improvement", "birdie", "double bogie", "eagle"],
    correctAnswer: "eagle",
    objective: "obj_playing",
  },
  {
    id: "com.scorm.golfsamples.interactions.playing_3",
    text: "A typical golf course has ____ holes",
    type: "QUESTION_TYPE_NUMERIC",
    choices: null,
    correctAnswer: 18,
    objective: "obj_playing",
  },
  {
    id: "com.scorm.golfsamples.interactions.playing_4",
    text: "In stableford scoring, the highest score wins.",
    type: "QUESTION_TYPE_TF",
    choices: null,
    correctAnswer: true,
    objective: "obj_playing",
  },
  {
    id: "com.scorm.golfsamples.interactions.playing_5",
    text: "Par for a 175 yard hole is typically:",
    type: "QUESTION_TYPE_NUMERIC",
    choices: null,
    correctAnswer: 3,
    objective: "obj_playing",
  },
];

export default function QuestionTest() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const currentResponse = responses.find(
    (r) => r.questionId === currentQuestion.id
  );

  const handleAnswer = (response: QuestionResponse) => {
    console.log("Question answered:", response);

    // Store the response
    setResponses((prev) => {
      const filtered = prev.filter((r) => r.questionId !== response.questionId);
      return [...filtered, response];
    });

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < sampleQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        setShowResults(true);
      }
    }, 1500);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < sampleQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setResponses([]);
    setShowResults(false);
  };

  const correctCount = responses.filter((r) => r.isCorrect).length;
  const totalCount = responses.length;

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quiz Complete!
          </h2>
          <div className="text-4xl font-bold mb-4">
            <span
              className={
                correctCount === totalCount ? "text-green-600" : "text-blue-600"
              }
            >
              {correctCount}/{totalCount}
            </span>
          </div>
          <p className="text-gray-600 mb-6">
            You scored {Math.round((correctCount / totalCount) * 100)}%
          </p>

          <div className="space-y-4 mb-6">
            {responses.map((response, index) => {
              const question = sampleQuestions.find(
                (q) => q.id === response.questionId
              );
              return (
                <div
                  key={response.questionId}
                  className={`
                  p-3 rounded border text-left
                  ${
                    response.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Question {index + 1}</span>
                    {response.isCorrect ? (
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{question?.text}</p>
                  <p className="text-sm mt-1">
                    Your answer:{" "}
                    <span className="font-medium">
                      {String(response.userAnswer)}
                    </span>
                    {!response.isCorrect && (
                      <>
                        <br />
                        Correct answer:{" "}
                        <span className="font-medium text-green-600">
                          {String(question?.correctAnswer)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={resetQuiz}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Golf Course Quiz</h1>
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {sampleQuestions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 origin-left"
            style={
              {
                "--progress": `${
                  (currentQuestionIndex + 1) / sampleQuestions.length
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
          disabled={currentQuestionIndex === sampleQuestions.length - 1}
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

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Debug Info:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Current Question: {currentQuestion.id}</p>
          <p>Question Type: {currentQuestion.type}</p>
          <p>Responses Collected: {responses.length}</p>
          <p>Correct Answers: {correctCount}</p>
        </div>
      </div>
    </div>
  );
}
