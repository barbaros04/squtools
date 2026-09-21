import { onCleanup, onMount } from "solid-js";

const palette = {
  stone: "#4c6478",
  glass: "#0968b5",
  glassLight: "#3096d8",
  glassMint: "#087b72",
  amber: "#b56718",
  accent: "#0968b5",
};

export function TowerArt() {
  let canvas!: HTMLCanvasElement;

  onMount(() => {
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    const draw = (now: number) => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * ratio);
      const height = Math.round(bounds.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      const scale = bounds.width / 290;
      const x = 0;
      const y = Math.max(0, (bounds.height - 545 * scale) / 2);
      context.translate(x, y);
      context.scale(scale, scale);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = '600 13px "Cascadia Mono", Consolas, monospace';

      const text = (value: string, px: number, py: number, color = palette.stone, alpha = 1) => {
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.fillText(value, px, py);
      };
      const line = (x1: number, y1: number, x2: number, y2: number, color = palette.stone, width = 1) => {
        context.globalAlpha = 0.95;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
      };

      const gleam = 0.88 + Math.sin(now / 1100) * 0.12;
      // Finial and symmetrical dome.
      text("◆", 145, 14, palette.accent, gleam);
      line(145, 23, 145, 42, palette.stone);
      text("╭───────╮", 145, 43, palette.glassLight, gleam);
      text("╭─◇─◇─◇─◇─╮", 145, 58, palette.glass, gleam);
      text("╱◇─◇─◇─◇─◇─◇╲", 145, 73, palette.glassLight, gleam);
      text("╰────────────────╯", 145, 88, palette.stone);
      text("╔═══════════════════════════╗", 145, 103, palette.stone);
      text("╚╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╦╝", 145, 116, palette.stone, 0.8);

      // Clock chamber: a true circle and correctly positioned, live hands.
      line(72, 128, 72, 207); line(218, 128, 218, 207);
      line(72, 128, 218, 128); line(72, 207, 218, 207);
      context.globalAlpha = 0.95;
      context.strokeStyle = palette.stone;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(145, 168, 33, 0, Math.PI * 2);
      context.stroke();
      [0, 3, 6, 9].forEach((hour) => {
        const angle = hour / 12 * Math.PI * 2 - Math.PI / 2;
        const tx = 145 + Math.cos(angle) * 25;
        const ty = 168 + Math.sin(angle) * 25;
        text("·", tx, ty, palette.stone);
      });
      const date = new Date();
      const minute = date.getMinutes() + date.getSeconds() / 60;
      const hour = (date.getHours() % 12) + minute / 60;
      const hand = (angle: number, length: number, color: string, width: number) => {
        line(145, 168, 145 + Math.cos(angle) * length, 168 + Math.sin(angle) * length, color, width);
      };
      hand(hour / 12 * Math.PI * 2 - Math.PI / 2, 15, palette.stone, 2);
      hand(minute / 60 * Math.PI * 2 - Math.PI / 2, 23, palette.accent, 1.4);
      text("◆", 145, 168, palette.accent, gleam);

      // A long, ceremonial tower base: facade, four support planes, arcade, then fountain steps.
      text("╔═══════════════════════════╗", 145, 219, palette.stone);
      text("╚═══════════════════════════╝", 145, 231, palette.stone, 0.8);
      line(89, 240, 89, 410, palette.stone, 1.2); line(201, 240, 201, 410, palette.stone, 1.2);
      line(145, 240, 106, 281, palette.stone); line(145, 240, 184, 281, palette.stone);
      line(106, 281, 106, 399, palette.glass, 1.3); line(184, 281, 184, 399, palette.glass, 1.3);
      text("╭─╮", 145, 276, palette.glassLight, gleam);
      text("│◇◆◇│", 145, 292, palette.glass, gleam);
      text("│◆◇◆│", 145, 308, palette.glassMint, gleam);
      text("│◇◆◇│", 145, 324, palette.glassLight, gleam);
      text("│◆◇◆│", 145, 340, palette.glass, gleam);
      text("│◇◆◇│", 145, 356, palette.glassMint, gleam);
      text("│◆◇◆│", 145, 372, palette.glassLight, gleam);
      text("│◇◆◇│", 145, 388, palette.glass, gleam);
      text("╰─────╯", 145, 404, palette.glassLight, gleam);
      [300, 335, 370].forEach((py, index) => {
        text(index % 2 ? "◆" : "◇", 120, py, palette.amber, gleam);
        text(index % 2 ? "◆" : "◇", 170, py, palette.amber, gleam);
      });
      // Four flared support planes make the lower half unmistakably tower-like.
      line(89, 240, 47, 430, palette.stone, 1.2); line(201, 240, 243, 430, palette.stone, 1.2);
      line(72, 248, 23, 438, palette.stone); line(218, 248, 267, 438, palette.stone);
      line(106, 282, 78, 423, palette.glass); line(184, 282, 212, 423, palette.glass);
      text("╭──────╮", 72, 392, palette.stone); text("╭──────╮", 218, 392, palette.stone);
      text("│◇◆◇◆│", 72, 408, palette.glassMint, gleam); text("│◇◆◇◆│", 218, 408, palette.glassMint, gleam);
      text("╰──────╯", 72, 424, palette.stone); text("╰──────╯", 218, 424, palette.stone);
      text("╔═══════════════════════════════════════╗", 145, 438, palette.stone);
      text("║ ◇ ╱╲ ◇ ─ ◆ ─ ◇ ╲╱ ◇ ─ ◆ ─ ◇ ╱╲ ◇ ║", 145, 454, palette.glass, gleam);
      text("╠═══════════════════════════════════════╣", 145, 470, palette.stone);
      text("║ ◆ ─ ◇ ╲╱ ◇ ─ ◆ ─ ◇ ╱╲ ◇ ─ ◆ ─ ◇ ║", 145, 486, palette.glassMint, gleam);
      text("╚═══════════════════════════════════════╝", 145, 502, palette.stone);
      // Stepped fountain base: a quiet, moving strip of water under the architecture.
      text("╔═══════════════════════════════════════════════╗", 145, 516, palette.stone);
      text("≈  ∿  ≈  ∿  ≈  ∿  ≈  ∿  ≈  ∿  ≈  ∿  ≈", 145, 530, palette.glassLight, gleam);
      text("╚═══════════════════════════════════════════════╝", 145, 544, palette.stone);
      context.globalAlpha = 1;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    onCleanup(() => window.cancelAnimationFrame(frame));
  });

  return <canvas class="home-background-art" ref={canvas} aria-hidden="true" />;
}
