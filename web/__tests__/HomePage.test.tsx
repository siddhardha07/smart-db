import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "../src/pages/HomePage";
import '@testing-library/jest-dom';

describe("HomePage", () => {
  it("renders all main elements", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    // Check for main title
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();

    // Check for description
    expect(
      screen.getByText(/Create database schemas from Mermaid diagrams/)
    ).toBeInTheDocument();

    // Check for Get Started button
    expect(screen.getByText("Get Started")).toBeInTheDocument();

    // Check for footer text
    expect(
      screen.getByText(/Powered by advanced AI technology/)
    ).toBeInTheDocument();
  });

  it("calls onInsertData when Get Started button is clicked", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    const getStartedButton = screen.getByText("Get Started");
    fireEvent.click(getStartedButton);

    expect(mockOnInsertData).toHaveBeenCalledTimes(1);
  });

  it("renders with correct styling classes", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    // Check for main container with gradient background
    const outerContainer = screen.getByText("SmartDB AI").closest("div")
      ?.parentElement?.parentElement;
    expect(outerContainer).toHaveClass("min-h-screen");
    expect(outerContainer).toHaveClass("bg-gradient-to-br");

    // Check for button styling
    const button = screen.getByText("Get Started");
    expect(button).toHaveClass(
      "bg-blue-600",
      "hover:bg-blue-700",
      "text-white"
    );
  });

  it("has accessible button with proper attributes", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    const button = screen.getByRole("button", { name: "Get Started" });
    expect(button).toBeInTheDocument();
    expect(button).toBeEnabled();
  });

  it("renders database icon", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    // The Database icon should be present (check for lucide class)
    const icon = document.querySelector(".lucide-database");
    expect(icon).toBeInTheDocument();
  });

  it("renders plus icon in button", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    // The Plus icon should be present in the button
    const icon = document.querySelector(".lucide-plus");
    expect(icon).toBeInTheDocument();
  });

  it("handles multiple clicks correctly", () => {
    const mockOnInsertData = vi.fn();
    render(<HomePage onInsertData={mockOnInsertData} />);

    const button = screen.getByText("Get Started");

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnInsertData).toHaveBeenCalledTimes(3);
  });
});
