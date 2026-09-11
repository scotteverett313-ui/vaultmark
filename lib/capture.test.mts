import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_CAPTURE_SIZE, squareCrop } from "./capture.ts";

test("a landscape image is cropped from its horizontal centre", () => {
  const crop = squareCrop(900, 640);
  assert.equal(crop.shortEdge, 640);
  assert.equal(crop.sx, 130);
  assert.equal(crop.sy, 0);
  assert.equal(crop.size, 640);
});

test("a portrait image is cropped from its vertical centre", () => {
  const crop = squareCrop(640, 900);
  assert.equal(crop.shortEdge, 640);
  assert.equal(crop.sx, 0);
  assert.equal(crop.sy, 130);
});

test("an already-square image is not offset", () => {
  const crop = squareCrop(500, 500);
  assert.deepEqual({ sx: crop.sx, sy: crop.sy, size: crop.size }, { sx: 0, sy: 0, size: 500 });
});

test("large images are scaled down to the vault ceiling", () => {
  const crop = squareCrop(4000, 3000);
  assert.equal(crop.shortEdge, 3000, "crops the full short edge");
  assert.equal(crop.size, MAX_CAPTURE_SIZE, "but draws at the ceiling");
});

test("the same source always yields the same crop, so a re-upload verifies", () => {
  assert.deepEqual(squareCrop(1234, 987), squareCrop(1234, 987));
});
