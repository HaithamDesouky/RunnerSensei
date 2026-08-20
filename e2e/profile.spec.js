const { test, expect } = require("@playwright/test");
const fakeProfile = require("./fixtures/profile.json");
const path = require("path");

const SUPABASE_STORAGE_KEY = "supabase.auth.token";

const FAKE_USER = {
  id: "test-user-1",
  email: "test@example.com",
  role: "authenticated",
};

const FAKE_SESSION = {
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
  expires_at: 9999999999,
  expires_in: 3600,
  token_type: "bearer",
  user: FAKE_USER,
};

const DB_PROFILE = {
  id: "test-user-1",
  xp: fakeProfile.xp,
  level: fakeProfile.level,
  badges: fakeProfile.badges,
  current_streak: fakeProfile.currentStreak,
  last_run: fakeProfile.lastRunDate,
  weekly_runs: fakeProfile.weeklyRuns,
  total_runs: fakeProfile.totalRuns,
  avatar_url: null,
  username: fakeProfile.username,
};

test("profile page shows user info and badges", async ({ page }) => {
  await page.addInitScript(
    ([key, session, profile]) => {
      window.__TEST_MODE__ = true;
      window.__TEST_PROFILE__ = profile;
      localStorage.setItem(key, JSON.stringify(session));
    },
    [SUPABASE_STORAGE_KEY, FAKE_SESSION, DB_PROFILE],
  );

  await page.route("**/*supabase.co/**", (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FAKE_USER),
      });
    }
    if (url.includes("/rest/v1/profiles")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DB_PROFILE),
      });
    }
    if (url.includes("/rest/v1/runs")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
    return route.continue();
  });

  await page.goto("http://localhost:8081/");
  await expect(page.locator("text=RunnerSensei").first()).toBeVisible({
    timeout: 10000,
  });

  // Debug: check localStorage and window globals
  const debug = await page.evaluate(
    (key) => ({
      session: localStorage.getItem(key),
      testMode: window.__TEST_MODE__,
      testProfile: window.__TEST_PROFILE__,
      allKeys: Object.keys(localStorage),
    }),
    SUPABASE_STORAGE_KEY,
  );
  console.log("DEBUG:", JSON.stringify(debug, null, 2));

  // Open profile (header avatar or fallback)
  const openProfile = page.locator('[aria-label="Open Profile"]');
  if ((await openProfile.count()) > 0) {
    await openProfile.click();
  } else {
    await page.locator("text=T").first().click();
  }
  await page.screenshot({
    path: path.join("test-results", "profile-debug.png"),
  });
  await expect(page.locator("text=Profile").first()).toBeVisible({
    timeout: 8000,
  });
  // Debug dump of visible text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("BODYTEXT:\n" + bodyText);
  // Username is rendered as an avatar initial on web; check the labeled element
  await expect(
    page.locator('[aria-label="profile-initial"]').first(),
  ).toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=Level 3").first()).toBeVisible();
  await expect(page.locator("text=1234 XP").first()).toBeVisible();

  const firstBadge = page.locator("text=First Run").first();
  await expect(firstBadge).toBeVisible();
  await firstBadge.click();

  await expect(
    page.locator("text=Awarded when you log your first run.").first(),
  ).toBeVisible({ timeout: 5000 });
});

