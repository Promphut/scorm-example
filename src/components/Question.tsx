"use client";

import React, { useState, useEffect } from "react";
import { Question, QuestionProps, QuestionResponse } from "@/types/question";

export default function QuestionComponent({
  question,
  onAnswer,
  disabled = false,
  showCorrectAnswer = false,
  userAnswer,
}: QuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<
    string | number | boolean | null
  >(userAnswer || null);
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    if (userAnswer !== undefined) {
      setSelectedAnswer(userAnswer);
      setHasAnswered(true);
    }
  }, [userAnswer]);

  const handleAnswerSubmit = () => {
    if (selectedAnswer === null || selectedAnswer === undefined) return;

    const isCorrect = checkAnswer(selectedAnswer);
    const response: QuestionResponse = {
      questionId: question.id,
      userAnswer: selectedAnswer,
      isCorrect,
      timestamp: new Date(),
    };

    setHasAnswered(true);
    onAnswer(response);
  };

  const checkAnswer = (answer: string | number | boolean): boolean => {
    if (question.type === "QUESTION_TYPE_NUMERIC") {
      return Number(answer) === Number(question.correctAnswer);
    }
    return answer === question.correctAnswer;
  };

  const renderMultipleChoice = () => {
    if (!question.choices) return null;

    return (
      <div className="space-y-3">
        {question.choices.map((choice, index) => {
          const isSelected = selectedAnswer === choice;
          const isCorrect = choice === question.correctAnswer;
          const showAsCorrect = showCorrectAnswer && isCorrect;
          const showAsWrong = showCorrectAnswer && isSelected && !isCorrect;

          return (
            <label
              key={index}
              className={`
                flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                ${
                  disabled
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-gray-50"
                }
                ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}
                ${showAsCorrect ? "border-green-500 bg-green-50" : ""}
                ${showAsWrong ? "border-red-500 bg-red-50" : ""}
              `}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={choice}
                checked={isSelected}
                onChange={(e) => !disabled && setSelectedAnswer(e.target.value)}
                disabled={disabled}
                className="mr-3 h-4 w-4 text-blue-600"
              />
              <span className="text-gray-900">{choice}</span>
              {showAsCorrect && (
                <svg
                  className="ml-auto h-5 w-5 text-green-600"
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
              )}
              {showAsWrong && (
                <svg
                  className="ml-auto h-5 w-5 text-red-600"
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
            </label>
          );
        })}
      </div>
    );
  };

  const renderNumericInput = () => {
    const isCorrect =
      showCorrectAnswer &&
      Number(selectedAnswer) === Number(question.correctAnswer);
    const isWrong =
      showCorrectAnswer &&
      hasAnswered &&
      Number(selectedAnswer) !== Number(question.correctAnswer);

    return (
      <div className="space-y-3">
        <div className="relative">
          <input
            type="number"
            value={(selectedAnswer as number) || ""}
            onChange={(e) =>
              !disabled && setSelectedAnswer(Number(e.target.value))
            }
            disabled={disabled}
            placeholder="Enter your answer"
            className={`
              w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
              ${isCorrect ? "border-green-500 bg-green-50" : ""}
              ${isWrong ? "border-red-500 bg-red-50" : "border-gray-300"}
            `}
          />
          {isCorrect && (
            <svg
              className="absolute right-3 top-3 h-5 w-5 text-green-600"
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
          )}
          {isWrong && (
            <svg
              className="absolute right-3 top-3 h-5 w-5 text-red-600"
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
        {showCorrectAnswer && isWrong && (
          <p className="text-sm text-green-600">
            Correct answer: {question.correctAnswer}
          </p>
        )}
      </div>
    );
  };

  const renderTrueFalse = () => {
    const trueSelected = selectedAnswer === true;
    const falseSelected = selectedAnswer === false;
    const correctAnswer = question.correctAnswer as boolean;
    const showTrueAsCorrect = showCorrectAnswer && correctAnswer === true;
    const showFalseAsCorrect = showCorrectAnswer && correctAnswer === false;
    const showTrueAsWrong =
      showCorrectAnswer && trueSelected && correctAnswer === false;
    const showFalseAsWrong =
      showCorrectAnswer && falseSelected && correctAnswer === true;

    return (
      <div className="space-y-3">
        <label
          className={`
            flex items-center p-3 border rounded-lg cursor-pointer transition-colors
            ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}
            ${trueSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}
            ${showTrueAsCorrect ? "border-green-500 bg-green-50" : ""}
            ${showTrueAsWrong ? "border-red-500 bg-red-50" : ""}
          `}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            value="true"
            checked={trueSelected}
            onChange={() => !disabled && setSelectedAnswer(true)}
            disabled={disabled}
            className="mr-3 h-4 w-4 text-blue-600"
          />
          <span className="text-gray-900">True</span>
          {showTrueAsCorrect && (
            <svg
              className="ml-auto h-5 w-5 text-green-600"
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
          )}
          {showTrueAsWrong && (
            <svg
              className="ml-auto h-5 w-5 text-red-600"
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
        </label>

        <label
          className={`
            flex items-center p-3 border rounded-lg cursor-pointer transition-colors
            ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}
            ${falseSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}
            ${showFalseAsCorrect ? "border-green-500 bg-green-50" : ""}
            ${showFalseAsWrong ? "border-red-500 bg-red-50" : ""}
          `}
        >
          <input
            type="radio"
            name={`question-${question.id}`}
            value="false"
            checked={falseSelected}
            onChange={() => !disabled && setSelectedAnswer(false)}
            disabled={disabled}
            className="mr-3 h-4 w-4 text-blue-600"
          />
          <span className="text-gray-900">False</span>
          {showFalseAsCorrect && (
            <svg
              className="ml-auto h-5 w-5 text-green-600"
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
          )}
          {showFalseAsWrong && (
            <svg
              className="ml-auto h-5 w-5 text-red-600"
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
        </label>
      </div>
    );
  };

  const renderQuestionContent = () => {
    switch (question.type) {
      case "QUESTION_TYPE_CHOICE":
        return renderMultipleChoice();
      case "QUESTION_TYPE_NUMERIC":
        return renderNumericInput();
      case "QUESTION_TYPE_TF":
        return renderTrueFalse();
      default:
        return (
          <p className="text-red-500">
            Unsupported question type: {question.type}
          </p>
        );
    }
  };

  const canSubmit =
    selectedAnswer !== null && selectedAnswer !== undefined && !hasAnswered;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {question.type.replace("QUESTION_TYPE_", "").toLowerCase()}
          </span>
          <span className="text-xs text-gray-500">ID: {question.id}</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {question.text}
        </h3>
        {question.objective && (
          <p className="text-sm text-gray-600">
            Objective: {question.objective}
          </p>
        )}
      </div>

      {/* Question Content */}
      <div className="mb-6">{renderQuestionContent()}</div>

      {/* Submit Button */}
      {!hasAnswered && (
        <div className="flex justify-end">
          <button
            onClick={handleAnswerSubmit}
            disabled={!canSubmit || disabled}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors
              ${
                canSubmit && !disabled
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Answer Feedback */}
      {hasAnswered && showCorrectAnswer && (
        <div
          className={`
          mt-4 p-3 rounded-lg border
          ${
            checkAnswer(selectedAnswer!)
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        `}
        >
          <div className="flex items-center">
            {checkAnswer(selectedAnswer!) ? (
              <>
                <svg
                  className="h-5 w-5 text-green-600 mr-2"
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
                <span className="text-green-800 font-medium">Correct!</span>
              </>
            ) : (
              <>
                <svg
                  className="h-5 w-5 text-red-600 mr-2"
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
                <span className="text-red-800 font-medium">Incorrect</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
