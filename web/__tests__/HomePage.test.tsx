import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "../src/pages/HomePage";
import "@testing-library/jest-dom";

describe("HomePage", () => {
  it("renders all main elements", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    // Check for main title
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();

    // Check for description
    expect(
      screen.getByText(/The intelligent database management platform/)
    ).toBeInTheDocument();

    // Check for mode buttons
    expect(screen.getByText("AI Mode")).toBeInTheDocument();
    expect(screen.getByText("Database Mode")).toBeInTheDocument();

    // Check for feature highlights
    expect(screen.getByText("Lightning Fast")).toBeInTheDocument();
    expect(screen.getByText("AI-Powered")).toBeInTheDocument();
    expect(screen.getByText("Multi-Database")).toBeInTheDocument();
  });

  it("calls onAIMode when AI Mode card is clicked", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    const aiModeCard = screen.getByText("AI Mode").closest("div");
    fireEvent.click(aiModeCard!);

    expect(mockOnAIMode).toHaveBeenCalledTimes(1);
    expect(mockOnDBMode).not.toHaveBeenCalled();
  });

  it("calls onDBMode when Database Mode card is clicked", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    const dbModeCard = screen.getByText("Database Mode").closest("div");
    fireEvent.click(dbModeCard!);

    expect(mockOnDBMode).toHaveBeenCalledTimes(1);
    expect(mockOnAIMode).not.toHaveBeenCalled();
  });

  it("renders with correct styling classes", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    // Check for welcome section styling
    const welcomeSection = screen.getByText("Welcome to").closest("div");
    expect(welcomeSection).toHaveClass("mb-8");

    // Check for AI mode card styling - get the parent div with the cursor-pointer class
    const aiModeText = screen.getByText("AI Mode");
    const aiModeCard = aiModeText.closest("div[class*='cursor-pointer']");
    expect(aiModeCard).toHaveClass("cursor-pointer");
  });

  it("renders database icon", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    // The Database icon should be present (check for lucide class)
    const icons = document.querySelectorAll(".lucide-database");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders brain icon for AI mode", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    // The Brain icon should be present in AI mode card
    const icon = document.querySelector(".lucide-brain");
    expect(icon).toBeInTheDocument();
  });

  it("renders sparkles icon", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    // The Sparkles icon should be present
    const icon = document.querySelector(".lucide-sparkles");
    expect(icon).toBeInTheDocument();
  });

  it("handles multiple clicks correctly", () => {
    const mockOnAIMode = vi.fn();
    const mockOnDBMode = vi.fn();
    render(<HomePage onAIMode={mockOnAIMode} onDBMode={mockOnDBMode} />);

    const aiModeCard = screen.getByText("AI Mode").closest("div");
    const dbModeCard = screen.getByText("Database Mode").closest("div");

    fireEvent.click(aiModeCard!);
    fireEvent.click(dbModeCard!);
    fireEvent.click(aiModeCard!);

    expect(mockOnAIMode).toHaveBeenCalledTimes(2);
    expect(mockOnDBMode).toHaveBeenCalledTimes(1);
  });
});
