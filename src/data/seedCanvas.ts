import type { CanvasObject, CanvasObjectType } from "../types/canvas";

export const ARTBOARD_WIDTH = 800;
export const ARTBOARD_HEIGHT = 1200;

type Extra = Partial<CanvasObject>;

function factory(pageId: string) {
  const make = (id: string, type: CanvasObjectType, name: string, x: number, y: number, width: number, height: number, extra: Extra = {}): CanvasObject => ({
    id: `${pageId}-${id}`,
    pageId,
    type,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: "#0c2b2b",
    stroke: "transparent",
    strokeWidth: 0,
    opacity: 1,
    cornerRadius: 0,
    shadowBlur: 0,
    shadowColor: "#000000",
    visible: true,
    locked: false,
    version: 1,
    updatedAt: Date.now(),
    updatedBy: "aqsa",
    ...extra,
  });
  const text = (id: string, name: string, value: string, x: number, y: number, width: number, size: number, color = "#0c2b2b", extra: Extra = {}) =>
    make(id, "text", name, x, y, width, size * 2.2, { text: value, fill: color, fontFamily: "Inter", fontSize: size, fontWeight: "400", lineHeight: 1.25, ...extra });
  const rect = (id: string, name: string, x: number, y: number, width: number, height: number, fill: string, extra: Extra = {}) =>
    make(id, "rect", name, x, y, width, height, { fill, ...extra });
  const group = (id: string, name: string, parentId?: string) =>
    make(id, "group", name, 0, 0, 0, 0, { parentId, fill: "transparent" });
  return { make, text, rect, group };
}

export function buildLandingObjects(pageId = "home"): CanvasObject[] {
  const { make, text, rect, group } = factory(pageId);
  const root = `${pageId}-artboard`;
  const header = `${pageId}-header`;
  const hero = `${pageId}-hero`;
  const features = `${pageId}-features`;
  const stats = `${pageId}-impact`;
  const objects: CanvasObject[] = [
    make("artboard", "frame", "Home", 0, 0, ARTBOARD_WIDTH, ARTBOARD_HEIGHT, { fill: "#fffef4", stroke: "#dfdacf", strokeWidth: 1, locked: true }),
    group("header", "Header", root),
    rect("logo-leaf", "Logo mark", 52, 28, 26, 24, "#5b9148", { parentId: header, cornerRadius: 16, rotation: -35 }),
    text("logo", "NovaGrow logo", "NovaGrow", 86, 27, 155, 18, "#0c2b2b", { parentId: header, fontWeight: "800" }),
    text("nav-home", "Home link", "Home", 278, 34, 43, 10, "#18393a", { parentId: header, fontWeight: "600" }),
    text("nav-features", "Features link", "Features", 351, 34, 65, 10, "#18393a", { parentId: header, fontWeight: "600" }),
    text("nav-pricing", "Pricing link", "Pricing", 439, 34, 54, 10, "#18393a", { parentId: header, fontWeight: "600" }),
    text("nav-testimonials", "Testimonials link", "Testimonials", 517, 34, 85, 10, "#18393a", { parentId: header, fontWeight: "600" }),
    rect("nav-button", "Get Started button", 652, 20, 106, 36, "#668e50", { parentId: header, cornerRadius: 20 }),
    text("nav-button-text", "Button label", "Get Started", 668, 29, 78, 12, "#ffffff", { parentId: header, fontWeight: "700", align: "center" }),
    rect("header-divider", "Header divider", 30, 75, 740, 1, "#e4dfd4", { parentId: header }),

    group("hero", "Hero Section", root),
    rect("hero-tag", "Eyebrow border", 54, 180, 176, 22, "#fffef4", { parentId: hero, stroke: "#b59a40", strokeWidth: 1, cornerRadius: 11 }),
    text("hero-tag-text", "Eyebrow", "The Future of Sustainable Living", 63, 185, 160, 10, "#334131", { parentId: hero, fontWeight: "600" }),
    text("heading", "Heading", "Grow a Greener", 54, 218, 395, 51, "#0b3030", { parentId: hero, fontWeight: "800", lineHeight: 1.03 }),
    text("heading-accent", "Heading accent", "Tomorrow", 54, 270, 375, 54, "#ed2768", { parentId: hero, fontWeight: "800", lineHeight: 1.05 }),
    text("description", "Description", "Smart solutions for a sustainable future. Track your impact, reduce your carbon footprint, and make a real difference.", 54, 343, 345, 16, "#2c4748", { parentId: hero, lineHeight: 1.48, height: 84 }),
    rect("cta-button", "CTA Button", 54, 437, 150, 49, "#668e50", { parentId: hero, cornerRadius: 22 }),
    text("cta-label", "CTA label", "Get Started Free", 73, 453, 111, 12, "#ffffff", { parentId: hero, align: "center", fontWeight: "700" }),
    rect("demo-button", "Watch Demo button", 222, 437, 150, 49, "#fffef4", { parentId: hero, stroke: "#e2dccb", strokeWidth: 1, cornerRadius: 22 }),
    text("demo-play", "Play icon", ">", 244, 449, 15, 19, "#102c2a", { parentId: hero, fontWeight: "700" }),
    text("demo-label", "Watch Demo label", "Watch Demo", 266, 454, 96, 12, "#102c2a", { parentId: hero, fontWeight: "700" }),
    make("hero-image", "image", "Hero Image", 447, 157, 300, 331, { parentId: hero, src: "/images/plant-hero.jpg", arch: true, fill: "#e5bfad", cornerRadius: 8 }),
    rect("carbon-card", "Carbon saved label", 541, 393, 168, 72, "#fffdf5", { parentId: hero, cornerRadius: 13, stroke: "#c4d1b2", strokeWidth: 1, shadowBlur: 11, shadowColor: "#0c2b2b22" }),
    make("carbon-icon", "ellipse", "Carbon icon", 553, 415, 29, 29, { parentId: hero, fill: "#dce9ca" }),
    text("carbon-icon-text", "Leaf symbol", "N", 562, 419, 15, 14, "#638d4f", { parentId: hero, fontWeight: "800" }),
    text("carbon-small", "Carbon caption", "Carbon Saved", 592, 405, 102, 10, "#264042", { parentId: hero, fontWeight: "600" }),
    text("carbon-value", "Carbon value", "2.4 tons", 592, 421, 105, 15, "#0d2d2d", { parentId: hero, fontWeight: "800" }),
    text("carbon-arrow", "Growth arrow", "+", 685, 423, 14, 19, "#4e8746", { parentId: hero, fontWeight: "800" }),

    group("impact", "Impact numbers", root),
    rect("impact-bg", "Impact background", 42, 539, 716, 160, "#e9f0dc", { parentId: stats, cornerRadius: 20 }),
    ...[206, 383, 560].map((x, index) => rect(`impact-divider-${index}`, "Divider", x, 564, 1, 108, "#cfddc6", { parentId: stats })),
  ];

  const metrics = [
    { x: 54, mark: "N", value: "50K+", label: "Active Users" },
    { x: 233, mark: "T", value: "120K+", label: "Trees Planted" },
    { x: 410, mark: ":)", value: "98%", label: "Satisfaction Rate" },
    { x: 585, mark: "*", value: "4.8/5", label: "App Rating" },
  ];
  metrics.forEach(({ x, mark, value, label }, index) => {
    objects.push(
      make(`metric-circle-${index}`, "ellipse", `${label} icon background`, x + 58, 556, 48, 48, { parentId: stats, fill: "#fffef6" }),
      text(`metric-mark-${index}`, `${label} icon`, mark, x + 63, 562, 39, 24, index === 3 ? "#d9a425" : "#65934e", { parentId: stats, fontWeight: "800", align: "center" }),
      text(`metric-value-${index}`, `${label} value`, value, x + 12, 620, 143, 21, "#0c2929", { parentId: stats, align: "center", fontWeight: "800" }),
      text(`metric-label-${index}`, `${label} label`, label, x + 3, 654, 158, 13, "#183839", { parentId: stats, align: "center", fontWeight: "500" }),
    );
  });

  objects.push(
    group("features", "Features", root),
    rect("feature-tag", "Our Features tag", 54, 732, 91, 22, "#fffef4", { parentId: features, cornerRadius: 11, stroke: "#ee6283", strokeWidth: 1 }),
    text("feature-tag-text", "Section label", "Our Features", 64, 737, 73, 10, "#203736", { parentId: features, fontWeight: "600" }),
    text("features-heading", "Features heading", "Everything You Need for", 54, 778, 550, 34, "#0b3030", { parentId: features, fontWeight: "800", lineHeight: 1.1 }),
    text("features-heading-accent", "Features accent", "a Greener Planet", 54, 813, 466, 34, "#638f4e", { parentId: features, fontWeight: "800" }),
    text("features-description", "Features description", "Powerful tools and insights to help you live sustainably and make a positive impact on the environment.", 54, 870, 510, 15, "#294749", { parentId: features, height: 51, lineHeight: 1.45 }),
  );

  const featureCards = [
    { x: 54, title: "Track Your Impact", copy: "Monitor your carbon footprint and see your progress.", color: "#679655", light: "#e4efdd", border: "#b9d6aa", mark: "N" },
    { x: 291, title: "Earn Rewards", copy: "Get points for sustainable choices and redeem rewards.", color: "#e84162", light: "#fde1e4", border: "#f8c9c7", mark: "*" },
    { x: 528, title: "Join a Community", copy: "Connect with like-minded people and create change together.", color: "#d89b20", light: "#fff0c7", border: "#f2d59c", mark: "+" },
  ];
  featureCards.forEach((card, index) => {
    objects.push(
      rect(`feature-card-${index}`, `Feature Card ${index + 1}`, card.x, 942, 218, 155, "#fffdf7", { parentId: features, cornerRadius: 12, stroke: card.border, strokeWidth: 1 }),
      make(`feature-icon-bg-${index}`, "ellipse", "Icon background", card.x + 17, 959, 43, 43, { parentId: features, fill: card.light }),
      text(`feature-icon-${index}`, "Feature icon", card.mark, card.x + 25, 965, 28, 24, card.color, { parentId: features, align: "center", fontWeight: "800" }),
      text(`feature-title-${index}`, card.title, card.title, card.x + 17, 1012, 176, 13, "#133233", { parentId: features, fontWeight: "800" }),
      text(`feature-copy-${index}`, "Feature description", card.copy, card.x + 17, 1041, 181, 11, "#345052", { parentId: features, height: 42, lineHeight: 1.45 }),
      text(`feature-arrow-${index}`, "Arrow", "->", card.x + 180, 986, 22, 18, card.color, { parentId: features, fontWeight: "700" }),
    );
  });
  objects.push(group("testimonials", "Testimonials", root), group("footer", "Footer", root));
  return objects;
}

export function buildSecondaryObjects(pageId: string, name: string): CanvasObject[] {
  const { make, text, rect, group } = factory(pageId);
  const colors = name === "Pricing" ? ["#e9f0dc", "#f6e9e5"] : name === "About" ? ["#ecede2", "#e9efe0"] : ["#f4e8df", "#e7eddf"];
  const title = name === "About" ? "A better future starts here." : name === "Pricing" ? "Good things grow together." : "Let's make a difference.";
  const body = name === "About" ? "We're making sustainable choices simple, rewarding, and part of everyday life." : name === "Pricing" ? "Find the right plan for every stage of your sustainability journey." : "Have a question or an idea? We'd love to hear from you.";
  return [
    make("artboard", "frame", name, 0, 0, ARTBOARD_WIDTH, ARTBOARD_HEIGHT, { fill: "#fffef5", locked: true, stroke: "#dfdacf", strokeWidth: 1 }),
    group("header", "Header", `${pageId}-artboard`),
    rect("logo-leaf", "Logo mark", 52, 29, 25, 24, "#61934c", { cornerRadius: 15, rotation: -35, parentId: `${pageId}-header` }),
    text("logo", "NovaGrow logo", "NovaGrow", 86, 27, 160, 18, "#0e3030", { fontWeight: "800", parentId: `${pageId}-header` }),
    text("nav", "Navigation", "Home        Features        Pricing        Testimonials", 312, 34, 350, 11, "#294442", { parentId: `${pageId}-header` }),
    rect("divider", "Divider", 30, 75, 740, 1, "#e6e1d8", { parentId: `${pageId}-header` }),
    group("content", `${name} Section`, `${pageId}-artboard`),
    rect("eyebrow-bg", "Eyebrow", 54, 160, 104, 28, "#ecf2e1", { cornerRadius: 14, parentId: `${pageId}-content` }),
    text("eyebrow", "Page label", `OUR ${name.toUpperCase()}`, 70, 168, 85, 11, "#578649", { fontWeight: "700", parentId: `${pageId}-content` }),
    text("title", "Heading", title, 54, 229, 655, 64, "#0c3030", { fontWeight: "800", height: 160, lineHeight: 1.08, parentId: `${pageId}-content` }),
    text("description", "Description", body, 54, 408, 510, 20, "#36504c", { height: 95, lineHeight: 1.5, parentId: `${pageId}-content` }),
    rect("main-panel", "Featured section", 54, 550, 690, 290, colors[0], { cornerRadius: 24, parentId: `${pageId}-content` }),
    text("panel-title", "Feature heading", name === "Pricing" ? "Everything you need, nothing you don't." : "Small actions. Lasting impact.", 91, 595, 430, 34, "#173b32", { fontWeight: "800", height: 100, parentId: `${pageId}-content` }),
    text("panel-copy", "Feature copy", "Beautifully simple tools for a world that feels better for everyone.", 91, 711, 388, 18, "#415a4e", { height: 80, parentId: `${pageId}-content` }),
    make("panel-circle", "ellipse", "Decoration", 557, 584, 137, 137, { fill: colors[1], parentId: `${pageId}-content` }),
    rect("bottom-card-one", "Detail one", 54, 876, 330, 179, "#f5f1e7", { cornerRadius: 16, parentId: `${pageId}-content` }),
    rect("bottom-card-two", "Detail two", 414, 876, 330, 179, "#e8eeda", { cornerRadius: 16, parentId: `${pageId}-content` }),
    text("bottom-label-one", "Detail label", "Made for the everyday", 79, 920, 263, 21, "#143631", { fontWeight: "700", parentId: `${pageId}-content` }),
    text("bottom-label-two", "Detail label", "Better, together", 439, 920, 263, 21, "#143631", { fontWeight: "700", parentId: `${pageId}-content` }),
  ];
}

export function buildTemplateObjects(templateId: string, pageId: string): CanvasObject[] {
  if (templateId === "novagrow") return buildLandingObjects(pageId);
  const label: Record<string, string> = {
    moneta: "Overview", metric: "Dashboard", studio: "Portfolio", shoppe: "Shop", social: "Social", pitch: "Presentation",
  };
  const objects = buildSecondaryObjects(pageId, label[templateId] ?? "Home");
  const copy: Record<string, { brand: string; title: string; description: string; fill: string }> = {
    moneta: { brand: "moneta.", title: "Money made simple.", description: "Your money, your future. A better way to see the whole picture.", fill: "#dce5f9" },
    metric: { brand: "metric.", title: "Clarity in every number.", description: "The workspace that makes your most important insights make sense.", fill: "#e6e2f6" },
    studio: { brand: "FORM / STUDIO", title: "Ideas worth making.", description: "Independent design work built with intention and imagination.", fill: "#f4e2d9" },
    shoppe: { brand: "goodshop", title: "Find your everyday good.", description: "Considered essentials for a home that feels like yours.", fill: "#e7e6d5" },
    social: { brand: "GOOD VIBES", title: "Make your mark.", description: "A little more color. A lot more possibility.", fill: "#f9dde4" },
    pitch: { brand: "THE IDEA CO.", title: "The next big thing starts here.", description: "A story with purpose, presented beautifully.", fill: "#e9e4f1" },
  };
  const details = copy[templateId] ?? copy.studio;
  return objects.map((object) => {
    if (object.id.endsWith("-logo")) return { ...object, text: details.brand };
    if (object.id.endsWith("-title")) return { ...object, text: details.title };
    if (object.id.endsWith("-description")) return { ...object, text: details.description };
    if (object.id.endsWith("-main-panel")) return { ...object, fill: details.fill };
    return object;
  });
}

export const initialCanvasObjects: CanvasObject[] = [
  ...buildLandingObjects("home"),
  ...buildSecondaryObjects("about", "About"),
  ...buildSecondaryObjects("pricing", "Pricing"),
  ...buildSecondaryObjects("contact", "Contact"),
  ...buildTemplateObjects("moneta", "mobile-home"),
  ...buildTemplateObjects("studio", "portfolio-home"),
  ...buildTemplateObjects("metric", "commerce-home"),
];