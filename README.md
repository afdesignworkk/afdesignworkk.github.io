# AF / DESIGN

Portfolio of **Anna Fesenko**, a UI/UX designer based in Odesa, Ukraine.

**Live site → [afdesignworkk.github.io](https://afdesignworkk.github.io)**

The site was designed in Figma and built in plain HTML, CSS and JavaScript. There is no framework and no build step. Most of the motion is driven by scrolling.

## Pages

| Page | File | What's on it |
| --- | --- | --- |
| Home | `index.html` | Hero, selected work, how I work, contact |
| About | `about.html` | The longer story, a portrait and two rows of travel photographs |
| Playground | `playground.html` | A board of side projects you drag around, with a full-size view for each piece |
| Spacebring | `case-spacebring.html` | Case study: the Spacebring admin web app |

## What's inside

- A window of butter jelly behind the hero line (WebGL), which ripples and swells to the pointer, and tags you can pick up and throw
- Grid lines that stay fixed while the page scrolls, and smooth scrolling
- How I work: the page dims and scrolling flies you through three principles in depth
- A footer that comes at you out of the dark, with a pool of the same jelly along the bottom
- A live clock with the time in Ukraine
- A drag board on the Playground page
- Reduced-motion support

## Project structure

```
.
├── index.html          Home page
├── home/               Home page styles, scripts, the jelly shader and the grid
├── about.html          About page
├── about.css           About page styles
├── about.js            About page scripts: scrolling, cursor, gallery, footer
├── playground.html     Playground page (its scripts are inline)
├── playground.css      Playground page styles
├── case-spacebring.html  Spacebring case study
├── case.css            Case study styles
├── styles.css          Shared styles for About, Playground and the case study
├── responsive.css/js   Laptop, tablet and phone layouts for those pages
└── assets/
    ├── about/          About page photographs
    ├── playground/     Playground thumbnails, with full-size images in full/
    ├── grid-overlay.svg
    └── status-dot.svg
```

## Contact

- Email: [af.designworkk@gmail.com](mailto:af.designworkk@gmail.com)
- [LinkedIn](https://www.linkedin.com/in/anna-fesenko-79b015271/)
- [Instagram](https://www.instagram.com/ai_annae21/)

---

© 2026 Anna Fesenko. All rights reserved. The design, text and photographs on this site may not be reused without permission.
