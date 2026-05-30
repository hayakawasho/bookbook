import { describe, expect, expectTypeOf, it } from "vitest";

import { defineEntity } from "../defineEntity";
import { defineIdBrand } from "../defineIdBrand";

import type { BrandId } from "../defineIdBrand";

describe("defineEntity", () => {
  it("mints id when omitted", () => {
    const idT = defineIdBrand<"t">();
    const E = defineEntity(idT)<{ title?: string }>();
    const a = E.create({ title: "a" });
    expect(typeof a.id).toBe("string");
    expect(a.id.length).toBeGreaterThan(0);
    expect(a.title).toBe("a");
  });

  it("uses explicit id when provided", () => {
    const idT = defineIdBrand<"t">();
    const E = defineEntity(idT)<{ title?: string }>();
    const branded = idT("manual");
    const a = E.create({ title: "x", id: branded });
    expect(a.id).toBe(branded);
  });

  it("BrandId keeps literal K", () => {
    const idW = defineIdBrand<"work">();
    const W = defineEntity(idW)<{ title?: string }>();
    const w = W.create({ title: "t" });
    expectTypeOf(w.id).toEqualTypeOf<BrandId<"work">>();
    expectTypeOf(w.id).not.toEqualTypeOf<BrandId<string>>();
  });

  it("two brands are not interchangeable", () => {
    const idA = defineIdBrand<"a">();
    const idB = defineIdBrand<"b">();
    const A = defineEntity(idA)<{ v: number }>();
    const B = defineEntity(idB)<{ v: number }>();
    const a = A.create({ v: 1 });
    const b = B.create({ v: 2 });
    // @ts-expect-error BrandId<"a"> and BrandId<"b"> are not assignable
    const _: typeof b.id = a.id;
    expect(String(a.id)).not.toBe(String(b.id));
  });

  it("rejects excess keys via strict shape", () => {
    const idT = defineIdBrand<"t">();
    const E = defineEntity(idT)<{ title: string }>();
    // @ts-expect-error excess key `extra` is not allowed
    E.create({ title: "x", extra: 1 });
  });
});
