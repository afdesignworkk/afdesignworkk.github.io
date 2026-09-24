# AF / DESIGN

Portfolio of **Anna Fesenko**, a UI/UX designer based in Odesa, Ukraine.

**Live site → [afdesignworkk.github.io](https://afdesignworkk.github.io)**

The site was designed in Figma and built in plain HTML, CSS and JavaScript. There is no framework and no build step. Most of the motion is driven by scrolling.

## Pages

| Page | File | What's on it |
| --- | --- | --- |
| Home | `index.html` | Hero, introduction, case studies, services, contact |
| About | `about.html` | The longer story, a portrait and two rows of travel photographs |
| Playground | `playground.html` | A board of side projects you drag around, with a full-size view for each piece |

## What's inside

- Liquid chrome metaballs (WebGL2) in the hero and the About headline, drawn toward the pointer
- A loading screen that draws the grid first, and grid lines that stay fixed while the page scrolls
- A live clock with the time in Ukraine
- Scroll-driven transitions between the sections, and chrome drips under the footer
- A custom cursor and smooth scrolling
- A drag board on the Playground page
- Reduced-motion support

## Project structure

```
.
├── index.html          Home page (its scripts and shaders are inline)
├── about.html          About page
├── about.css           About page styles
├── about.js            About page scripts: scrolling, cursor, gallery, footer
├── playground.html     Playground page (its scripts are inline)
├── playground.css      Playground page styles
├── styles.css          Shared styles: colour and type tokens, top bar, grid, home page
└── assets/
    ├── about/          About page photographs
    ├── playground/     Playground thumbnails, with full-size images in full/
    ├── hero-orb.png
    ├── grid-overlay.svg
    └── status-dot.svg
```

## Contact

- Email: [af.designworkk@gmail.com](mailto:af.designworkk@gmail.com)
- [LinkedIn](https://www.linkedin.com/in/anna-fesenko-79b015271/)
- [Instagram](https://www.instagram.com/ai_annae21/)

---

© 2026 Anna Fesenko. All rights reserved. The design, text and photographs on this site may not be reused without permission.
