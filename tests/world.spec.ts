import { test, expect, type Page } from "@playwright/test";
const world = (p: Page) => p.locator(".portfolio-world");
async function phase(p: Page, value: string) {
  await expect(world(p)).toHaveAttribute("data-phase", value, { timeout: 60000 });
}
async function walk(p: Page, key: string, ms: number) {
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  await p.waitForTimeout(350);
}
async function moveTo(p: Page, key: string, axis: "x" | "z", target: number) {
  await p.keyboard.down(key);
  try {
    await expect
      .poll(async () => Number(await world(p).getAttribute(`data-player-${axis}`)), {
        timeout: 30000,
        intervals: [100],
      })
      [key === "a" || key === "w" ? "toBeLessThan" : "toBeGreaterThan"](target);
  } finally {
    await p.keyboard.up(key);
  }
  await p.waitForTimeout(300);
}
async function approach(p: Page, key: string, name: RegExp) {
  await p.keyboard.down(key);
  try {
    await expect(p.getByRole("button", { name })).toBeVisible({ timeout: 30000 });
  } finally {
    await p.keyboard.up(key);
  }
  await p.waitForTimeout(250);
}
async function lowQuality(p: Page) {
  await p.getByRole("button", { name: "Open world settings" }).click();
  await p.getByLabel("Render quality").selectOption("low");
  await p.getByRole("button", { name: "Close dialog" }).click();
}

async function start(p: Page) {
  await p.goto("/");
  await p.getByRole("button", { name: "Start exploring" }).click();
  await p.getByRole("button", { name: "Let’s explore" }).click();
  await phase(p, "outdoor");
  await lowQuality(p);
}
async function go(p: Page, name: string) {
  await p
    .getByRole("navigation", { name: "Direct section navigation" })
    .getByRole("button", { name })
    .click();
  await phase(p, "indoor");
  await expect.poll(async () => Number(await world(p).getAttribute("data-player-x"))).toBe(0);
}
async function exitRoom(p: Page) {
  await moveTo(p, "s", "z", 5.6);
  await moveTo(p, "a", "x", 0.3);
  await expect(p.getByRole("button", { name: /Return to campus/ })).toBeVisible();
  await p.keyboard.press("e");
  await phase(p, "outdoor");
}
async function computer(p: Page) {
  await moveTo(p, "d", "x", 1.8);
  await approach(p, "w", /Open workstation/);
  await p.keyboard.press("e");
  await phase(p, "computer");
}

test("complete journey, grounded chat, all rooms, persistence, routes and standard pages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Start exploring" }).waitFor();
  await page.getByRole("button", { name: /The Companion/ }).click();
  await expect(page.getByRole("button", { name: /The Companion/ })).toHaveCSS(
    "background-color",
    "rgb(245, 236, 220)",
  );
  await page.screenshot({ path: "/tmp/pa-selection.png" });
  await page.getByRole("button", { name: "Start exploring" }).click();
  await page.getByRole("button", { name: "Let’s explore" }).click();
  await phase(page, "outdoor");
  await expect(page.getByText("0 of 6 destinations explored")).toBeVisible();
  await page.screenshot({ path: "/tmp/pa-campus.png" });
  await lowQuality(page);
  // Walk to the nearby lab without quick travel and verify building walls stop the player.
  await moveTo(page, "a", "x", -10.8);
  await moveTo(page, "w", "z", 0.5);
  await walk(page, "a", 1200);
  const x = Number(await world(page).getAttribute("data-player-x"));
  expect(x).toBeGreaterThan(-12.2);
  await expect(page.getByRole("button", { name: /Enter Projects/ })).toBeVisible();
  await page.keyboard.press("e");
  await phase(page, "indoor");
  await expect(page.getByText("0 of 6 destinations explored")).toBeVisible();
  await moveTo(page, "a", "x", -1.6);
  await approach(page, "w", /Talk to P’AI/);
  await page.keyboard.press("e");
  await phase(page, "chat");
  await page.waitForTimeout(200); // Allow the ten-Hz position display to settle after opening chat.
  const before = await world(page).getAttribute("data-player-z");
  await page
    .getByRole("textbox", { name: "Ask your section guide" })
    .pressSequentially("wasd E space");
  await page.waitForTimeout(300);
  expect(await world(page).getAttribute("data-player-z")).toBe(before);
  await page.getByRole("button", { name: "What problem does SeatPeekr solve?" }).click();
  await expect(
    page.getByText(/Portfolio lookup · content-backed response|P’AI · AI response/),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("1 of 6 destinations explored")).toBeVisible();
  await page.screenshot({ path: "/tmp/pa-chat.png" });
  await page.getByRole("button", { name: "Show me on the computer" }).click();
  await phase(page, "computer");
  const screen = page.locator(".monitor-interface");
  await expect(screen.getByRole("heading", { name: "SeatPeekr", exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "AI Finance Tracker" }).click();
  await expect(
    screen.getByRole("heading", { name: "AI Finance Tracker", exact: true }),
  ).toBeVisible();
  await expect(screen.getByRole("link", { name: /Visit AI Finance Tracker/ })).toHaveAttribute(
    "href",
    "https://airafinancetracker.netlify.app/",
  );
  await page.screenshot({ path: "/tmp/pa-computer.png" });
  await page.keyboard.press("Escape");
  await phase(page, "indoor");
  // Repeated computer interaction reuses the same room and agent.
  await moveTo(page, "d", "x", 1.8);
  await expect(page.getByRole("button", { name: /Open workstation/ })).toBeVisible();
  await page.keyboard.press("e");
  await phase(page, "computer");
  expect(await page.locator(".monitor-interface").count()).toBe(1);
  await page.keyboard.press("Escape");
  await phase(page, "indoor");
  await exitRoom(page);
  // All remaining destinations expose their full shared content, completing only on interaction.
  for (const [name, id, content] of [
    ["About Me", "about", "Pradyumna Aher"],
    ["Experience", "experience", "Jan 2025 — Present"],
    ["Systems Thinking", "thinking", "Research notes incoming"],
    ["Skills / Toolkit", "skills", "LangGraph"],
    ["Contact", "contact", "pradyumnaaher05@gmail.com"],
  ]) {
    await go(page, name);
    await expect(world(page)).toHaveAttribute("data-room", id);
    await computer(page);
    await expect(
      page.locator(".monitor-interface").getByText(content, { exact: false }).first(),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await phase(page, "indoor");
    await exitRoom(page);
    const west = ["about", "projects", "skills"].includes(id);
    await expect
      .poll(async () => Number(await world(page).getAttribute("data-player-x")))
      .toBe(west ? -11.4 : 11.4);
  }
  await expect(page.getByText("6 of 6 destinations explored")).toBeVisible();
  await phase(page, "outdoor");
  await expect(world(page)).toHaveAttribute("data-room", "campus");
  expect(Number(await world(page).getAttribute("data-player-x"))).toBeCloseTo(11.4, 0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pa-campus-v1")!));
  expect(saved.character).toBe("robot");
  expect(saved.completed).toHaveLength(6);
  await page.reload();
  await phase(page, "selection");
  await expect(page.getByRole("button", { name: /The Companion/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("6 of 6 destinations explored · progress saved")).toBeVisible();
  await page
    .getByRole("link", { name: /View standard portfolio/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: /Building applied AI systems/ })).toBeVisible({
    timeout: 30000,
  });
  await page.goto("/experience");
  await expect(page.getByText("Jan 2025 — Present")).toBeVisible();
  await page.goto("/thinking");
  await expect(page.getByText("Research notes incoming")).toHaveCount(3);
  await page.goto("/work/seatpeekr");
  await expect(page.getByRole("heading", { name: "SeatPeekr" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("driving, safe stationary exit, modal input guards, route selection and exploration reset", async ({
  page,
}) => {
  await start(page);
  // Dragging rotates the camera and therefore changes the direction of forward movement.
  await page.mouse.move(600, 450);
  await page.mouse.down();
  await page.mouse.move(760, 450);
  await page.mouse.up();
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(async () => Number(await world(page).getAttribute("data-player-x")))
    .toBeGreaterThan(0.5);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "Reset player to plaza" }).click();
  await expect.poll(async () => Number(await world(page).getAttribute("data-player-x"))).toBe(0);
  await page.locator(".world-canvas").click({ position: { x: 600, y: 450 } });
  await page.keyboard.press("Space");
  await expect
    .poll(async () => Number(await world(page).getAttribute("data-player-y")), { intervals: [50] })
    .toBeGreaterThan(0.1);
  await expect.poll(async () => Number(await world(page).getAttribute("data-player-y"))).toBe(0);
  await page.keyboard.down("Shift");
  await approach(page, "d", /Drive campus cruiser/);
  await page.keyboard.up("Shift");
  await page.keyboard.press("e");
  await phase(page, "driving");
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await world(page).getAttribute("data-speed")), { timeout: 30000 })
    .toBeGreaterThan(1.5);
  await page.keyboard.press("e");
  await phase(page, "driving");
  await expect(page.getByText("Brake to a stop before leaving the car.")).toBeVisible();
  await page.keyboard.up("w");
  await expect
    .poll(async () => Math.abs(Number(await world(page).getAttribute("data-speed"))), {
      timeout: 20000,
    })
    .toBeLessThan(0.3);
  await page.keyboard.press("e");
  await phase(page, "outdoor");
  await page.getByRole("button", { name: "Reset player to plaza" }).click();
  await expect.poll(async () => Number(await world(page).getAttribute("data-player-x"))).toBe(0);
  await page.getByRole("button", { name: "Open controls guide" }).click();
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  expect(Number(await world(page).getAttribute("data-player-z"))).toBe(5);
  await page.keyboard.press("Escape");
  await page
    .getByLabel("Campus minimap")
    .getByRole("button", { name: "Experience", exact: true })
    .click();
  await page.getByRole("button", { name: "Quick travel" }).click();
  await phase(page, "indoor");
  await expect(world(page)).toHaveAttribute("data-room", "experience");
  await expect(page.getByText("0 of 6 destinations explored")).toBeVisible();
  await page.getByRole("button", { name: "Open world settings" }).click();
  await page.getByLabel("Render quality").selectOption("low");
  await page.getByLabel("Reduced motion").check();
  await page.getByRole("button", { name: "Reset exploration & character" }).click();
  await phase(page, "selection");
  await expect(page.getByRole("button", { name: /The Explorer/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("mobile joystick, chat and computer remain usable; WebGL fallback links to standard content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  const joystick = page.getByRole("group", { name: "Virtual movement joystick" });
  await expect(joystick).toBeVisible();
  const b = await joystick.boundingBox();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2 - 30, b!.y + b!.height / 2);
  await expect
    .poll(async () => Number(await world(page).getAttribute("data-player-x")), { timeout: 10000 })
    .toBeLessThan(-0.5);
  await page.mouse.up();
  await go(page, "About Me");
  await computer(page);
  await expect(
    page.locator(".mobile-computer").getByRole("heading", { name: "About Me" }),
  ).toBeVisible();
  await page.locator(".mobile-computer").screenshot({ path: "/tmp/pa-mobile-computer.png" });
  await page.getByRole("button", { name: /Back to room/ }).click();
  await phase(page, "indoor");
  await page.screenshot({ path: "/tmp/pa-mobile.png" });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.reload();
  await expect(page.getByText("This browser doesn’t support the 3D world.")).toBeVisible();
  await page.locator(".world-unavailable").getByRole("link").click();
  await expect(page.getByRole("heading", { name: /Building applied AI systems/ })).toBeVisible({
    timeout: 30000,
  });
});

test("assistant API validates input and grounds public contact, dates and selected project", async ({
  request,
}) => {
  for (const [section, message, expected] of [
    ["experience", "What did Pradyumna do at TCS?", "Jan 2025"],
    ["contact", "How can I contact Pradyumna?", "pradyumnaaher05@gmail.com"],
    ["projects", "What problem does SeatPeekr solve?", "seat"],
    ["thinking", "How does he approach RAG and agent workflows?", "retrieval"],
  ]) {
    const response = await request.post("/api/portfolio-assistant", {
      data: { section, message, project: "seatpeekr" },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(["live", "lookup"]).toContain(data.mode);
    expect(data.answer.toLowerCase()).toContain(expected.toLowerCase());
  }
  const invalid = await request.post("/api/portfolio-assistant", {
    data: { message: "x".repeat(601) },
  });
  expect(invalid.status()).toBe(400);
  const unavailable = await request.post("/api/portfolio-assistant", {
    data: { section: "about", message: "What degree does he have?" },
  });
  expect((await unavailable.json()).answer).toMatch(/not published|not available|does not/i);
});
