export const HELIOS_CANONICAL_MATERIALIZATION_VERSION = 1;

export type HeliosPdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lineBreakAfter?: boolean;
};

export type HeliosCanonicalTextSpan = {
  spanKey: string;
  readingOrder: number;
  text: string;
  boundary: { x: number; y: number; width: number; height: number };
  confidence: number;
};

function finite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedBoundary(
  item: HeliosPdfTextItem,
  pageWidth: number,
  pageHeight: number,
) {
  const x = clamp(finite(item.x, "Text x") / pageWidth, 0, 1);
  const y = clamp(finite(item.y, "Text y") / pageHeight, 0, 1);
  const width = clamp(finite(item.width, "Text width") / pageWidth, 0, 1 - x);
  const height = clamp(finite(item.height, "Text height") / pageHeight, 0, 1 - y);
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function rounded(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function mergeBoundary(
  left: HeliosCanonicalTextSpan["boundary"],
  right: HeliosCanonicalTextSpan["boundary"],
) {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const rightEdge = Math.max(left.x + left.width, right.x + right.width);
  const bottomEdge = Math.max(left.y + left.height, right.y + right.height);
  return {
    x: rounded(x),
    y: rounded(y),
    width: rounded(rightEdge - x),
    height: rounded(bottomEdge - y),
  };
}

function sameLine(
  previous: HeliosCanonicalTextSpan,
  candidate: HeliosCanonicalTextSpan,
) {
  const previousCenter = previous.boundary.y + previous.boundary.height / 2;
  const candidateCenter = candidate.boundary.y + candidate.boundary.height / 2;
  const tolerance = Math.max(previous.boundary.height, candidate.boundary.height) * 0.55;
  const horizontalGap = candidate.boundary.x - (previous.boundary.x + previous.boundary.width);
  return (
    Math.abs(previousCenter - candidateCenter) <= tolerance &&
    horizontalGap >= -Math.max(previous.boundary.height, candidate.boundary.height) &&
    horizontalGap <= Math.max(previous.boundary.height, candidate.boundary.height) * 3
  );
}

export function buildHeliosCanonicalTextSpans(input: {
  pageWidth: number;
  pageHeight: number;
  items: HeliosPdfTextItem[];
}) {
  const pageWidth = finite(input.pageWidth, "Page width");
  const pageHeight = finite(input.pageHeight, "Page height");
  if (pageWidth <= 0 || pageHeight <= 0) {
    throw new Error("Page dimensions must be positive.");
  }
  const spans: Array<HeliosCanonicalTextSpan & { lineBreakAfter: boolean }> = [];
  for (const item of input.items) {
    const text = item.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const boundary = normalizedBoundary(item, pageWidth, pageHeight);
    if (!boundary) continue;
    const candidate: HeliosCanonicalTextSpan & { lineBreakAfter: boolean } = {
      spanKey: "",
      readingOrder: spans.length,
      text: text.slice(0, 2_000),
      boundary: Object.fromEntries(
        Object.entries(boundary).map(([key, value]) => [key, rounded(value)]),
      ) as HeliosCanonicalTextSpan["boundary"],
      confidence: 100,
      lineBreakAfter: Boolean(item.lineBreakAfter),
    };
    const previous = spans.at(-1);
    if (previous && !previous.lineBreakAfter && sameLine(previous, candidate)) {
      previous.text = `${previous.text} ${candidate.text}`.slice(0, 2_000);
      previous.boundary = mergeBoundary(previous.boundary, candidate.boundary);
      previous.lineBreakAfter = candidate.lineBreakAfter;
      continue;
    }
    spans.push(candidate);
  }
  return spans.map(({ lineBreakAfter: _lineBreakAfter, ...span }, readingOrder) => ({
    ...span,
    spanKey: `native:${readingOrder}`,
    readingOrder,
  }));
}

