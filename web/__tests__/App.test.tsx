import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import App from "../src/App";

describe("App", () => {
  beforeEach(() => {
    // Mock successful database response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        databases: [
          { name: "test_db", type: "PostgreSQL" },
          { name: "sample_db", type: "MySQL" },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders HomePage by default", () => {
    render(<App />);

    // Check for the Welcome heading specifically (not the header title)
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.getByText("AI Mode")).toBeInTheDocument();
    expect(screen.getByText("Database Mode")).toBeInTheDocument();
  });

  it("switches to AI Mode when AI Mode card is clicked", () => {
    render(<App />);

    const aiModeCard = screen.getByText("AI Mode").closest("div");
    fireEvent.click(aiModeCard!);

    // Should now show AIMode page
    expect(screen.getByText("AI Mode Coming Soon")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to")).not.toBeInTheDocument();
  });

  it("switches to DB Mode when Database Mode card is clicked", () => {
    render(<App />);

    const dbModeCard = screen.getByText("Database Mode").closest("div");
    fireEvent.click(dbModeCard!);

    // Should now show DBMode page
    expect(screen.getByText("Database Console")).toBeInTheDocument();
    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    expect(screen.queryByText("Welcome to")).not.toBeInTheDocument();
  });

  it("switches back to HomePage when back button is clicked from AIMode", () => {
    render(<App />);

    // Navigate to AIMode
    const aiModeCard = screen.getByText("AI Mode").closest("div");
    fireEvent.click(aiModeCard!);

    // Navigate back to HomePage using the back button (ArrowLeft icon button)
    const backButton = screen.getByRole("button", { name: "" }); // ArrowLeft icon button
    fireEvent.click(backButton);

    // Should show HomePage again
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.queryByText("AI Mode Coming Soon")).not.toBeInTheDocument();
  });

  it("switches back to HomePage when back button is clicked from DBMode", () => {
    render(<App />);

    // Navigate to DBMode
    const dbModeCard = screen.getByText("Database Mode").closest("div");
    fireEvent.click(dbModeCard!);

    // Navigate back to HomePage using the back button (ArrowLeft icon button)
    const backButton = screen.getByRole("button", { name: "" }); // ArrowLeft icon button
    fireEvent.click(backButton);

    // Should show HomePage again
    expect(screen.getByText("Welcome to")).toBeInTheDocument();
    expect(screen.queryByText("Database Console")).not.toBeInTheDocument();
  });

  it("renders header consistently across all pages", () => {
    render(<App />);

    // Check header on home page
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getAllByText("SmartDB AI")).toHaveLength(2); // Header + HomePage title

    // Switch to AI mode
    const aiModeCard = screen.getByText("AI Mode").closest("div");
    fireEvent.click(aiModeCard!);

    // Header should still be there
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();
  });

  it("renders database explorer sidebar in DB mode", async () => {
    render(<App />);

    // Switch to DB Mode
    const dbModeCard = screen.getByText("Database Mode").closest("div");
    fireEvent.click(dbModeCard!);

    // Wait for database loading to complete and check for explorer
    await waitFor(() => {
      expect(screen.getByText("Database Explorer")).toBeInTheDocument();
    });
  });
});
