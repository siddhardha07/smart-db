import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "../src/App";

describe("App", () => {
  it("renders HomePage by default", () => {
    render(<App />);

    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(
      screen.getByText(/Create database schemas from Mermaid diagrams/)
    ).toBeInTheDocument();
  });

  it("switches to InsertDataPage when Get Started is clicked", () => {
    render(<App />);

    const getStartedButton = screen.getByText("Get Started");
    fireEvent.click(getStartedButton);

    // Should now show InsertDataPage
    expect(screen.getByText("Insert Data")).toBeInTheDocument();
    expect(screen.queryByText("SmartDB AI")).not.toBeInTheDocument();
  });

  it("switches back to HomePage when back button is clicked from InsertDataPage", () => {
    render(<App />);

    // Navigate to InsertDataPage
    const getStartedButton = screen.getByText("Get Started");
    fireEvent.click(getStartedButton);

    // Navigate back to HomePage
    const backButton = screen.getAllByRole("button")[0];
    fireEvent.click(backButton);

    // Should show HomePage again
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();
    expect(screen.queryByText("Insert Data")).not.toBeInTheDocument();
  });

  it("maintains mode state correctly", () => {
    render(<App />);

    // Start at home
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();

    // Go to insert
    fireEvent.click(screen.getByText("Get Started"));
    expect(screen.getByText("Insert Data")).toBeInTheDocument();

    // Go back to home
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText("SmartDB AI")).toBeInTheDocument();

    // Go to insert again
    fireEvent.click(screen.getByText("Get Started"));
    expect(screen.getByText("Insert Data")).toBeInTheDocument();
  });
});
