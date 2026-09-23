import { expect, test } from "@playwright/test";

test.describe("Private Article Collections E2E Flow", () => {
  const generateUser = (prefix) => {
    const id = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    return {
      username: id,
      email: `${id}@example.com`,
      password: "Password123!",
    };
  };

  test("Full lifecycle: register, create collection, save article, verify detail, remove article, delete collection", async ({
    page,
    request,
  }) => {
    const userA = generateUser("alice");
    const collectionName = `DevOps Systems ${Date.now()}`;
    const collectionDesc = "Curated collection of distributed systems and container architectures.";
    const articleTitle = `Zero Downtime Deployments ${Date.now()}`;
    const articleDesc = "Best practices for blue-green and canary releases.";
    const articleBody = "## Introduction\nZero downtime deployments ensure uninterrupted service for users.";
    const articleTags = "devops, cloud";

    // 1. Authenticate Alice via API and establish session
    const userRes = await request.post("http://localhost:3001/api/users", {
      data: { user: userA },
    });
    expect(userRes.ok()).toBeTruthy();
    const { user: userTokenData } = await userRes.json();

    await page.goto("/#/");
    await page.evaluate((userData) => {
      const auth = {
        headers: { Authorization: `Token ${userData.token}` },
        isAuth: true,
        loggedUser: userData,
      };
      localStorage.setItem("loggedUser", JSON.stringify(auth));
    }, userTokenData);
    await page.reload();

    // Verify authenticated navbar
    const myCollectionsNav = page.locator('nav a.nav-link:has-text("My Collections")');
    await expect(myCollectionsNav).toBeVisible({ timeout: 10000 });

    // 2. Navigate to Collections Page
    await myCollectionsNav.click();
    await expect(page).toHaveURL(/.*#\/collections/);
    await expect(page.getByTestId("empty-collections-state")).toBeVisible();
    await expect(page.getByText("No collections yet")).toBeVisible();

    // 3. Create a New Collection
    await page.getByTestId("create-collection-btn").click();
    await expect(page.getByText("Create New Collection")).toBeVisible();
    await page.getByTestId("collection-name-input").fill(collectionName);
    await page.getByTestId("collection-desc-input").fill(collectionDesc);
    await page.getByTestId("save-collection-submit-btn").click();

    // Verify collection card appears in the list with 0 articles
    await expect(page.getByText(collectionName)).toBeVisible();
    await expect(page.getByText("0 articles")).toBeVisible();

    // 4. Create an Article
    await page.click('a.nav-link:has-text("New Article")');
    await expect(page).toHaveURL(/.*#\/editor/);
    await page.fill('input[name="title"]', articleTitle);
    await page.fill('input[name="description"]', articleDesc);
    await page.fill('textarea[name="body"]', articleBody);
    await page.fill('input[name="tags"]', articleTags);
    await page.click('button:has-text("Publish Article")');

    // Wait for article page to load
    await expect(page.locator("h1")).toHaveText(articleTitle, { timeout: 15000 });

    // 5. Save Article to Collection
    const saveBtn = page.locator('button:has-text("Save to Collection")').first();
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify Save to Collection modal opens
    await expect(page.getByText("Select the collections you would like to save")).toBeVisible();
    await expect(page.getByText(collectionName)).toBeVisible();

    // Click on collection option to toggle membership
    const collectionOption = page.locator(`.collection-checkbox-item:has-text("${collectionName}")`);
    await collectionOption.click();

    // Verify checkbox is checked
    await expect(collectionOption.locator('input[type="checkbox"]')).toBeChecked();

    // Close modal
    await page.click('button:has-text("Done")');

    // 6. Navigate back to Collections and verify article count is 1
    await myCollectionsNav.click();
    await expect(page.getByText(collectionName)).toBeVisible();
    await expect(page.getByText("1 article")).toBeVisible();

    // 7. Click on the collection to view detail page
    await page.locator(`.collection-card:has-text("${collectionName}") a:has-text("View")`).click();
    await expect(page).toHaveURL(/.*#\/collections\/\d+/);

    // Verify collection detail page contains article
    await expect(page.getByTestId("collection-detail-name")).toContainText(collectionName);
    await expect(page.getByText(articleTitle)).toBeVisible();

    // 8. Remove Article from collection
    const removeBtn = page.getByTitle("Remove from this collection");
    await expect(removeBtn).toBeVisible();
    await removeBtn.click();

    // Verify empty state is rendered in collection detail
    await expect(page.getByTestId("empty-collection-articles")).toBeVisible();
    await expect(page.getByTestId("collection-detail-count")).toHaveText("0 articles");

    // 9. Delete Collection
    await page.getByTestId("delete-collection-btn").click();
    await expect(page.getByText("Safe Deletion", { exact: false })).toBeVisible();
    await page.getByTestId("confirm-delete-detail-btn").click();

    // Verify redirected back to collections list and collection is removed
    await expect(page).toHaveURL(/.*#\/collections/);
    await expect(page.getByTestId("empty-collections-state")).toBeVisible();
  });

  test("Security & Privacy Boundary: Cross-user collection isolation returns 404", async ({
    page,
    request,
  }) => {
    const userA = generateUser("alice_sec");
    const userB = generateUser("bob_sec");

    // 1. Create User A via API
    const userARes = await request.post("http://localhost:3001/api/users", {
      data: { user: userA },
    });
    expect(userARes.ok()).toBeTruthy();
    const userAJson = await userARes.json();
    const tokenA = userAJson.user.token;

    // 2. Create User A's private collection via API
    const colRes = await request.post("http://localhost:3001/api/collections", {
      headers: { Authorization: `Token ${tokenA}` },
      data: {
        collection: {
          name: `Secret Alice Notes ${Date.now()}`,
          description: "Top secret",
        },
      },
    });
    expect(colRes.ok()).toBeTruthy();
    const colJson = await colRes.json();
    const collectionId = colJson.collection.id;

    // 3. Register and login as User B
    const userBRes = await request.post("http://localhost:3001/api/users", {
      data: { user: userB },
    });
    expect(userBRes.ok()).toBeTruthy();
    const { user: userBData } = await userBRes.json();

    await page.goto("/#/");
    await page.evaluate((userData) => {
      const auth = {
        headers: { Authorization: `Token ${userData.token}` },
        isAuth: true,
        loggedUser: userData,
      };
      localStorage.setItem("loggedUser", JSON.stringify(auth));
    }, userBData);
    await page.reload();
    await expect(page.locator('nav a.nav-link:has-text("My Collections")')).toBeVisible({ timeout: 10000 });

    // 4. User B attempts to access User A's collection by direct URL navigation
    await page.goto(`/#/collections/${collectionId}`);

    // Verify 404 security boundary is enforced (Collection Not Found)
    await expect(page.getByTestId("collection-not-found")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Collection Not Found")).toBeVisible();
    await expect(
      page.getByText("This collection does not exist or you do not have permission to view it.")
    ).toBeVisible();
  });
});
