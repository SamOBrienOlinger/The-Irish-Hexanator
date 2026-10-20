# The Irish Hexanator

A collaborative frontend project that creates playful, fictional Irish hexes from randomly selected phrase parts.

**HTML · CSS · JavaScript**

[Visit the website](https://samobrienolinger.github.io/The-Irish-Hexanator/) · [Getting started](#getting-started) · [Repository guide](#repository-guide) · [Checks](#checks-and-review) · [Credits](#credits-and-reuse)

## What you can explore

- The original name-driven, three-part generator, final hex, shareable PNG image and restart flow.
- Expandable Mysteries & Myths articles and an About page introducing the project team.
- Original themed artwork, including the unchanged leprechaun hero, and a custom 404 page.

## Getting started

Requires Git, a browser and a local HTTP server. Python 3 provides one without installing application packages.

```bash
git clone https://github.com/SamOBrienOlinger/The-Irish-Hexanator.git
cd The-Irish-Hexanator
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [localhost:8000](http://localhost:8000). Serve the repository over HTTP so relative assets and page links resolve correctly.

## Repository guide

| Path | Purpose |
| --- | --- |
| [index.html](index.html) | Primary browser entry point |
| [assets/](assets/) | Project styles, scripts and original imagery |
| [assets/css/refresh.css](assets/css/refresh.css) | Shared responsive visual system |
| [tests/ui_regression.py](tests/ui_regression.py) | Browser and feature-parity regression suite |

## Checks and review

Test dependencies are development-only. They are not loaded by the website.

```bash
python -m pip install playwright==1.63.0
python -m playwright install --with-deps chromium firefox webkit
python tests/ui_regression.py
```

The test script starts its own local server on port 8000. Stop any existing server on that port first. It covers all four pages at 320, 390, 768 and 1440 CSS pixels in Chromium, Firefox and WebKit, the complete hex-generation and PNG-download journey, restart, keyboard-operated history disclosures, local resource errors and horizontal overflow. It also compares the original hero file and the three phrase lists against the pre-refresh commit.

GitHub Actions runs the same suite on pull requests and main-branch updates. Reports, screenshots and the tested source snapshot are saved in the `ui-regression-evidence` artifact for seven days. Inspect the actual workflow result rather than assuming every future commit passes.

Automated browser checks do not replace physical-device testing, a screen-reader review or a full accessibility audit. Existing external social-link destinations are retained; this refresh does not add direct posting or hosted image-sharing infrastructure. The pre-existing WhatsApp `#` destination remains a placeholder.

## Deployment

A GitHub Pages site is configured for this repository. Its published URL is linked at the top of this README.

## Credits and reuse

Design decisions, original feature notes, historical testing evidence and detailed acknowledgements remain available in the preserved project record:

- [README.md · original project record](https://github.com/SamOBrienOlinger/The-Irish-Hexanator/blob/44bcb5710ae5767c9ee6c1f9e7745fc2eedf982b/README.md)

Learning resources and starter material: [Code Institute](https://codeinstitute.net/).

No repository-level licence file is present in this snapshot. This README does not grant additional reuse permissions. Check with the relevant rights holders before reusing code, written content or assets.

## Support

Repository maintained in [Sam O’Brien-Olinger’s GitHub account](https://github.com/SamOBrienOlinger). For a problem or suggested improvement, [open an issue](https://github.com/SamOBrienOlinger/The-Irish-Hexanator/issues) with the affected page or command, steps to reproduce, and expected behaviour.

[Back to top](#the-irish-hexanator)
