import { describe, expectTypeOf, it } from "vitest";

import { defineIdBrand } from "../defineIdBrand";

import type { BrandId } from "../defineIdBrand";

describe("defineIdBrand", () => {
  it("narrows BrandId literal key in types", () => {
    const idA = defineIdBrand<"a">();
    const idB = defineIdBrand<"b">();
    const a: BrandId<"a"> = idA("x");
    const b: BrandId<"b"> = idB("y");
    expectTypeOf(a).toEqualTypeOf<BrandId<"a">>();
    expectTypeOf(b).toEqualTypeOf<BrandId<"b">>();
  });
});
