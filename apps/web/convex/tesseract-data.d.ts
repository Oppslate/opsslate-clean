declare module "tesseract-wasm" {
  export type OCRTextItem = {
    rect: { left: number; top: number; right: number; bottom: number };
    confidence: number;
    text: string;
  };
  export type OCREngine = {
    destroy(): void;
    loadModel(model: Uint8Array | ArrayBuffer): void;
    loadImage(image: ImageData): void;
    setVariable(name: string, value: string): void;
    getTextBoxes(unit: "line" | "word"): OCRTextItem[];
  };
  export function createOCREngine(options?: {
    wasmBinary?: Uint8Array | ArrayBuffer;
  }): Promise<OCREngine>;
}
