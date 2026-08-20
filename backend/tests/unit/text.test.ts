import { describe, expect, it } from "vitest";
import {
  cleanText,
  countWords,
  estimateTokens,
  humanFileSize,
  sanitizeFilename,
  slugify,
  truncate,
} from "../../src/utils/text.js";

describe("estimateTokens", () => {
  it("returns 0 for empty input", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens(null as unknown as string)).toBe(0);
  });

  it("estimates roughly 1 token per 4 chars", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords("   a  b c   ")).toBe(3);
  });
});

describe("truncate", () => {
  it("leaves short text untouched", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });

  it("appends ellipsis for long text", () => {
    expect(truncate("abcdefghij", 6)).toBe("abc...");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugify("RAG & AI / 101!!")).toBe("rag-ai-101");
  });

  it("collapses repeated dashes", () => {
    expect(slugify("a  b")).toBe("a-b");
  });
});

describe("sanitizeFilename", () => {
  it("replaces illegal path characters", () => {
    expect(sanitizeFilename('a/b:c*d?')).toBe("a_b_c_d_");
  });

  it("collapses spaces to underscores", () => {
    expect(sanitizeFilename("my file 2.md")).toBe("my_file_2.md");
  });

  it("caps length at 200 chars", () => {
    const long = "x".repeat(300);
    expect(sanitizeFilename(long).length).toBe(200);
  });
});

describe("humanFileSize", () => {
  it("formats bytes", () => {
    expect(humanFileSize(0)).toBe("0 B");
    expect(humanFileSize(1024)).toBe("1.0 KB");
    expect(humanFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});

describe("cleanText", () => {
  it("normalizes newlines and whitespace", () => {
    expect(cleanText("a\r\nb")).toBe("a\nb");
    expect(cleanText("  a    b  ")).toBe("a b");
    expect(cleanText("line1\n\n\n\nline2")).toBe("line1\n\nline2");
  });
});
