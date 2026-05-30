import { describe, expect, it } from "vitest";

import { defineModel } from "../defineModel";

describe("defineModel", () => {
  it("create returns a shallow copy", () => {
    const M = defineModel<{ a: number; nested: { x: number } }>();
    const nested = { x: 1 };
    const input = { a: 1, nested };
    const out = M.create(input);
    expect(out).not.toBe(input);
    expect(out).toEqual(input);
    expect(out.nested).toBe(nested);
  });
});
