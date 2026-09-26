import { describe, expect, test } from "bun:test";
import { withEnvironmentTitlePrefix } from "./environment-title.ts";

describe("environment tab title", () => {
  test("marks local development tabs as DEV", () => {
    expect(withEnvironmentTitlePrefix("LumiNotes", { development: true, profile: "local" }))
      .toBe("[DEV] LumiNotes");
    expect(withEnvironmentTitlePrefix("LumiNotes", { development: true, profile: "" }))
      .toBe("[DEV] LumiNotes");
  });

  test("marks the local demo profile as DEMO", () => {
    expect(withEnvironmentTitlePrefix("LumiNotes", { development: true, profile: "demo" }))
      .toBe("[DEMO] LumiNotes");
  });

  test("is idempotent during hot reloads and leaves production titles unchanged", () => {
    expect(withEnvironmentTitlePrefix("[LOCAL DEMO] LumiNotes", { development: true, profile: "demo" }))
      .toBe("[DEMO] LumiNotes");
    expect(withEnvironmentTitlePrefix("LumiNotes", { development: false, profile: "demo" }))
      .toBe("LumiNotes");
  });
});
