import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CollectionDetail from "./CollectionDetail";
import * as AuthContext from "../../context/AuthContext";
import getCollectionDetail from "../../services/getCollectionDetail";
import removeArticleFromCollection from "../../services/removeArticleFromCollection";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/getCollectionDetail");
vi.mock("../../services/removeArticleFromCollection");
vi.mock("../../services/updateCollection");
vi.mock("../../services/deleteCollection");

describe("CollectionDetail Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders collection details and paginated articles", async () => {
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    const mockDetail = {
      id: "42",
      name: "Distributed Consensus",
      description: "Raft, Paxos, and Zab protocols",
      articlesCount: 1,
      articles: [
        {
          id: 101,
          slug: "raft-protocol-explained",
          title: "Raft Protocol Explained",
          description: "In-depth guide to distributed state machines",
          body: "Full Raft analysis...",
          tagList: ["consensus", "distributed"],
          createdAt: "2026-01-01T00:00:00.000Z",
          author: {
            username: "dr_distributed",
            image: "https://api.realworld.io/images/smiley-cyrus.jpg",
          },
        },
      ],
    };

    getCollectionDetail.mockResolvedValue(mockDetail);

    render(
      <MemoryRouter initialEntries={["/collections/42"]}>
        <Routes>
          <Route path="/collections/:id" element={<CollectionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("collection-detail-name")).toHaveTextContent("Distributed Consensus");
      expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("1 article");
      expect(screen.getByText("Raft Protocol Explained")).toBeInTheDocument();
      expect(screen.getByText("dr_distributed")).toBeInTheDocument();
    });
  });

  it("removes article from collection upon user click", async () => {
    const user = userEvent.setup();
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    const mockDetail = {
      id: "42",
      name: "Distributed Consensus",
      description: "Articles",
      articlesCount: 1,
      articles: [
        {
          id: 101,
          slug: "raft-protocol-explained",
          title: "Raft Protocol Explained",
          description: "Summary",
          tagList: [],
          author: { username: "dr_distributed" },
        },
      ],
    };

    getCollectionDetail.mockResolvedValue(mockDetail);
    removeArticleFromCollection.mockResolvedValue({ message: "Article removed from collection" });

    render(
      <MemoryRouter initialEntries={["/collections/42"]}>
        <Routes>
          <Route path="/collections/:id" element={<CollectionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Raft Protocol Explained")).toBeInTheDocument();
    });

    const removeBtn = screen.getByTestId("remove-article-btn-raft-protocol-explained");
    await user.click(removeBtn);

    await waitFor(() => {
      expect(removeArticleFromCollection).toHaveBeenCalledWith({
        collectionId: "42",
        articleId: 101,
        slug: "raft-protocol-explained",
        headers: { Authorization: "Token abc" },
      });
    });

    // The article is removed and empty state is displayed
    expect(await screen.findByTestId("empty-collection-articles")).toBeInTheDocument();
    expect(screen.getByTestId("collection-detail-count")).toHaveTextContent("0 articles");
  });

  it("renders 404 not found boundary when accessing unauthorized or nonexistent collection", async () => {
    AuthContext.useAuth.mockReturnValue({
      isAuth: true,
      headers: { Authorization: "Token abc" },
      loggedUser: { username: "alice" },
    });

    getCollectionDetail.mockRejectedValue({
      response: { status: 404, data: { message: "Collection not found" } },
    });

    render(
      <MemoryRouter initialEntries={["/collections/999"]}>
        <Routes>
          <Route path="/collections/:id" element={<CollectionDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("collection-not-found")).toBeInTheDocument();
      expect(screen.getByText("Collection Not Found")).toBeInTheDocument();
    });
  });
});
