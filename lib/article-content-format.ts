export type ManagedArticleSection = {
  heading: string;
  paragraphs: string[];
  items?: string[];
};

function clean(value: string, maxLength: number) {
  return value.trim().replace(/\r/g, "").slice(0, maxLength);
}

export function parseArticleEditorText(value: string): ManagedArticleSection[] {
  const lines = String(value || "").replace(/\r/g, "").split("\n");
  const sections: ManagedArticleSection[] = [];
  let current: ManagedArticleSection = { heading: "متن مقاله", paragraphs: [] };
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    const paragraph = clean(paragraphBuffer.join(" "), 4000);
    if (paragraph) current.paragraphs.push(paragraph);
    paragraphBuffer = [];
  }

  function flushSection() {
    flushParagraph();
    const heading = clean(current.heading || "متن مقاله", 180) || "متن مقاله";
    const paragraphs = current.paragraphs.map((item) => clean(item, 4000)).filter(Boolean).slice(0, 40);
    const items = (current.items || []).map((item) => clean(item, 500)).filter(Boolean).slice(0, 40);
    if (paragraphs.length || items.length) {
      sections.push({ heading, paragraphs, ...(items.length ? { items } : {}) });
    }
    current = { heading: "متن مقاله", paragraphs: [] };
  }

  for (const rawLine of lines.slice(0, 600)) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      flushSection();
      current.heading = clean(line.slice(3), 180) || "بخش مقاله";
      continue;
    }
    if (!line) {
      flushParagraph();
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      current.items = [...(current.items || []), clean(line.slice(2), 500)].filter(Boolean);
      continue;
    }
    paragraphBuffer.push(line);
  }

  flushSection();
  return sections.slice(0, 30);
}

export function articleSectionsToEditorText(sections: ManagedArticleSection[]) {
  return sections
    .map((section) => {
      const lines = [
        `## ${clean(section.heading || "بخش مقاله", 180)}`,
        "",
        ...section.paragraphs.flatMap((paragraph) => [clean(paragraph, 4000), ""]),
        ...(section.items || []).map((item) => `- ${clean(item, 500)}`),
      ];
      return lines.join("\n").trim();
    })
    .join("\n\n");
}

export function parseStoredArticleSections(value: string): ManagedArticleSection[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
      .map((item) => ({
        heading: clean(String(item.heading || "بخش مقاله"), 180) || "بخش مقاله",
        paragraphs: Array.isArray(item.paragraphs)
          ? item.paragraphs.map((paragraph) => clean(String(paragraph), 4000)).filter(Boolean).slice(0, 40)
          : [],
        items: Array.isArray(item.items)
          ? item.items.map((entry) => clean(String(entry), 500)).filter(Boolean).slice(0, 40)
          : undefined,
      }))
      .filter((section) => section.paragraphs.length || section.items?.length)
      .slice(0, 30);
  } catch {
    return [];
  }
}
