import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SaveToCollectionModal from "./SaveToCollectionModal";
import * as AuthContext from "../../context/AuthContext";
import getCollections from "../../services/getCollections";
import getArticleCollectionStatus from "../../services/getArticleCollectionStatus";
import addArticleToCollection from "../../services/addArticleToCollection";
import removeArticleFromCollection from "../../services/removeArticleFromCollection";
import createCollection from "../../services/createCollection";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/getCollections");
vi.mock("../../services/getArticleCollectionStatus");
vi.mock("../../services/addArticleToCollection");
vi.mock("../../services/removeArticleFromCollection");
vi.mock("../../services/createCollection");

describe("SaveToCollectionModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockArticle = {
    id: 99,
    slug: "testing-software-at-scale",
    title: "Testing Software at Scale",
  };

  it("loads and displays user collections with membership status", async () => {
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    getCollections.mockResolvedValue([
      { id: "1", name: "Architecture", articleCount: 2 },
      { id: "2", name: "DevOps", articleCount: 0 },
    ]);
    getArticleCollectionStatus.mockResolvedValue(["1"]);

    render(
      <MemoryRouter>
        <SaveToCollectionModal isOpen={true} onClose={vi.fn()} article={mockArticle} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Architecture")).toBeInTheDocument();
      expect(screen.getByText("DevOps")).toBeInTheDocument();
    });

    const archOption = screen.getByTestId("collection-option-1");
    const devOpsOption = screen.getByTestId("collection-option-2");

    expect(archOption.querySelector("input")).toBeChecked();
    expect(devOpsOption.querySelector("input")).not.toBeChecked();
  });

  it("adds article to collection on click if not already member", async () => {
    const user = userEvent.setup();
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    getCollections.mockResolvedValue([
      { id: "2", name: "DevOps", articleCount: 0 },
    ]);
    getArticleCollectionStatus.mockResolvedValue([]);
    addArticleToCollection.mockResolvedValue({ message: "Article added" });

    render(
      <MemoryRouter>
        <SaveToCollectionModal isOpen={true} onClose={vi.fn()} article={mockArticle} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("DevOps")).toBeInTheDocument();
    });

    const devOpsOption = screen.getByTestId("collection-option-2");
    await user.click(devOpsOption);

    await waitFor(() => {
      expect(addArticleToCollection).toHaveBeenCalledWith({
        collectionId: "2",
        articleId: 99,
        slug: "testing-software-at-scale",
        headers: { Authorization: "Token abc" },
      });
    });

    expect(devOpsOption.querySelector("input")).toBeChecked();
  });
});
