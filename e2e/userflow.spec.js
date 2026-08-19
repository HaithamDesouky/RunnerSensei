const { test, expect } = require("@playwright/test");

test("user flow with API stubbing", async ({ page }) => {
  await page.route("**/*supabase.co/**", (route) => {
    const url = route.request().url();
    if (url.includes("/rest/v1/")) {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    }
    if (url.includes("/storage/v1/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ signedURL: "https://example.com/avatar.png" }),
      });
    }
    return route.continue();
  });

  await page.route("**/api.openai.com/**", (route) => {
    const fake = {
      id: "chatcmpl-xxx",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Stubbed Sensei suggestion" },
        },
      ],
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fake),
    });
  });

  await page.route("**/api/**", (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.goto("http://localhost:8081");

  await expect(page.locator("text=RunnerSensei")).toBeVisible();
});

