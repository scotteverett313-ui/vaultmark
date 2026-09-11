export const MAX_CAPTURE_SIZE = 800;
export const MIN_CAPTURE_SIZE = 400;

export interface SquareCrop {
  /** Source x/y of the centred square within the original image. */
  sx: number;
  sy: number;
  /** Edge length of that square in the source image. */
  shortEdge: number;
  /** Edge length it is drawn at — the vaulted resolution. */
  size: number;
}

// Capture and verify must agree pixel for pixel: the fingerprint is a hash of
// the drawn square, so any difference in how it is cropped or scaled makes a
// genuine original fail verification. Both paths go through here.
export function squareCrop(width: number, height: number): SquareCrop {
  const shortEdge = Math.min(width, height);
  return {
    sx: (width - shortEdge) / 2,
    sy: (height - shortEdge) / 2,
    shortEdge,
    size: Math.min(shortEdge, MAX_CAPTURE_SIZE),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = src;
  });
}

export interface VaultSquare {
  pixels: ImageData;
  size: number;
  canvas: HTMLCanvasElement;
}

/** Draws the centred square an artwork is vaulted as. Returns null if the browser has no 2D canvas. */
export function toVaultSquare(image: HTMLImageElement): VaultSquare | null {
  const { sx, sy, shortEdge, size } = squareCrop(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, sx, sy, shortEdge, shortEdge, 0, 0, size, size);
  return { pixels: ctx.getImageData(0, 0, size, size), size, canvas };
}
