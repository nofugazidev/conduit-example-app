import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CollectionsList from "./CollectionsList";
import * as AuthContext from "../../context/AuthContext";
import getCollections from "../../services/getCollections";
import createCollection from "../../services/createCollection";
import deleteCollection from "../../services/deleteCollection";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/getCollections");
vi.mock("../../services/createCollection");
vi.mock("../../services/deleteCollection");
vi.mock("../../services/updateCollection");

describe("CollectionsList Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders authentication required banner if user is not authenticated", () => {
    AuthContext.useAuth.mockReturnValue({
      isAuth: false,
      headers: null,
      loggedUser: {},
    });

    render(
      <MemoryRouter>
        <CollectionsList />
      </MemoryRouter>
    );

    expect(screen.getByText("Authentication Required")).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("renders empty state when user has no collections", async () => {
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });
    getCollections.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <CollectionsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-collections-state")).toBeInTheDocument();
    });
    expect(screen.getByText("No collections yet")).toBeInTheDocument();
  });

  it("renders list of collections and handles creation", async () => {
    const user = userEvent.setup();
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    const mockCollections = [
      {
        id: "1",
        name: "Backend Architecture",
        description: "Articles on distributed systems",
        articleCount: 3,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    getCollections.mockResolvedValue(mockCollections);
    createCollection.mockResolvedValue({
      id: "2",
      name: "React Deep Dives",
      description: "Frontend articles",
      articleCount: 0,
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    render(
      <MemoryRouter>
        <CollectionsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Backend Architecture")).toBeInTheDocument();
      expect(screen.getByText("3 articles")).toBeInTheDocument();
    });

    // Open create modal
    const createBtn = screen.getByTestId("create-collection-btn");
    await user.click(createBtn);

    expect(screen.getByText("Create New Collection")).toBeInTheDocument();
    const nameInput = screen.getByTestId("collection-name-input");
    const descInput = screen.getByTestId("collection-desc-input");
    const submitBtn = screen.getByTestId("save-collection-submit-btn");

    await user.type(nameInput, "React Deep Dives");
    await user.type(descInput, "Frontend articles");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createCollection).toHaveBeenCalledWith({
        name: "React Deep Dives",
        description: "Frontend articles",
        headers: { Authorization: "Token abc" },
      });
    });

    // The newly created collection should now appear on screen
    expect(await screen.findByText("React Deep Dives")).toBeInTheDocument();
  });

  it("handles collection deletion with safe invariant confirmation", async () => {
    const user = userEvent.setup();
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    const mockCollections = [
      {
        id: "1",
        name: "Security Reads",
        description: "Appsec papers",
        articleCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    getCollections.mockResolvedValue(mockCollections);
    deleteCollection.mockResolvedValue({});

    render(
      <MemoryRouter>
        <CollectionsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Security Reads")).toBeInTheDocument();
    });

    // Click delete
    const deleteBtn = screen.getByTestId("delete-collection-1");
    await user.click(deleteBtn);

    // Confirmation dialog appears with safe deletion guarantee
    expect(screen.getByText(/Safe Deletion Guarantee/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-delete-collection-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(deleteCollection).toHaveBeenCalledWith({
        id: "1",
        headers: { Authorization: "Token abc" },
      });
    });

    // Collection is removed from UI
    expect(screen.queryByText("Security Reads")).not.toBeInTheDocument();
  });
});
