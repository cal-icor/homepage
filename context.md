Cal-ICOR Central Website (Repo #1)

Agent Context & Build Instructions

You are building the central Cal-ICOR website (a multi-page site) that introduces Cal-ICOR, explains its partnership model, and links out to curriculum and documentation hosted elsewhere.

This repository is the front-door / marketing site, not the curriculum or textbook repo.

The current Cal-ICOR site uses JupyterBook v2, but this redesign prioritizes:

Full control over custom HTML + SCSS

Reusable, component-based layouts

Easy content updates via Markdown and YAML

Deployment via GitHub Pages (no servers, no paid hosting)

Reference & inspiration

Use the following as architectural and stylistic references:

2i2c website repository: https://github.com/2i2c-org/2i2c-org.github.io

HugoBlox (used by 2i2c): https://github.com/HugoBlox

You do not need to use HugoBlox, but the site should adopt similar patterns:

clean typography

modular sections (“blocks”)

fast navigation

clear calls-to-action

Prefer plain Hugo with a minimal theme if HugoBlox becomes restrictive.

Primary goals

Create a modern, accessible website that explains Cal-ICOR in under 10 seconds.

Implement the new site structure and content direction from the provided PDF mockups.

Keep the site easy to maintain:

page content in Markdown

structured repeated content in /data/*.yaml

reusable blocks in layouts/partials/

Deploy using GitHub Pages + GitHub Actions.

Non-goals (for this repo)

Do NOT host full curriculum, textbooks, or JupyterBooks here.

Do NOT depend on databases, servers, or CMS platforms.

Do NOT over-optimize for documentation navigation.

Required pages (site map)

Top navigation must include:

Home (/)

Partner With Us (/partner/)

Explore Materials (/materials/)

About (/about/)

Contact (/contact/)

Optional later:

FAQ

News / Updates

Page responsibilities
Home

Purpose: communicate value quickly and drive the next click.

Sections:

Hero (headline, short description, 2 CTAs)

Partner logo strip

“Why partner” feature cards (4 items)

“How it works” timeline (4 steps)

Materials teaser (3 components)

Final CTA band

Partner With Us

Purpose: de-risk adoption and explain the support model.

Content:

What to expect when partnering

Support & onboarding model

Detailed “How to get started” steps

Clear contact CTA

Explore Materials

Purpose: show what exists and how instructors adopt it.

Content:

Framing: accessible, flexible, collaborative

Three key material components

Links out to external curriculum repos/sites

CTA to contact or request access

About

Purpose: credibility and statewide infrastructure story.

Content:

Mission and equity framing

Who Cal-ICOR serves (visual or grid)

Partner acknowledgements (including 2i2c)

Contact

Purpose: one clear path to start a conversation.

Content:

Simple contact form or embedded Google Form

What information is helpful to include

Design & UX requirements

Modern, clean layout similar to 2i2c.org

Component-based sections reused across pages

Two primary CTAs used consistently:

“Partner with us”

“Explore sample materials”

Mobile-first responsive design

Accessible color contrast, semantic headings, alt text

Core reusable blocks (partials)

Implement these as reusable components:

Hero

Partner Logo Grid

Feature Cards

How-It-Works Timeline

Materials Teaser

CTA Band

Navbar

Footer

Each block should pull content from YAML data files when possible.

Content model (data-driven)

Create structured YAML files under /data/:

partners.yaml
Fields: name, logo, url

features.yaml
Fields: title, body, optional icon

steps.yaml
Fields: title, body

materials.yaml
Fields: title, body, link, optional image

This allows non-developers to update content safely.

Recommended repository structure
cal-icor-site/
  content/
    _index.md
    partner/_index.md
    materials/_index.md
    about/_index.md
    contact/_index.md
  data/
    partners.yaml
    features.yaml
    steps.yaml
    materials.yaml
  layouts/
    _default/
      baseof.html
      single.html
      list.html
    index.html
    partials/
      navbar.html
      footer.html
      hero.html
      logo_grid.html
      feature_cards.html
      timeline.html
      materials_teaser.html
      cta_band.html
  assets/
    scss/
      main.scss
      components/
        _navbar.scss
        _hero.scss
        _cards.scss
        _logos.scss
        _timeline.scss
        _cta.scss
  static/
    images/
      logos/
      screenshots/
  hugo.yaml
  .github/
    workflows/
      deploy.yml

Hugo & styling guidance

Use Hugo Extended (required for SCSS).

Keep theme usage minimal and override with your own partials.

Centralize spacing, colors, and typography using SCSS variables or CSS variables.

Use consistent max-width containers and section padding.

Deployment (GitHub Pages)

Use GitHub Actions to build the site on push to main.

Output to the gh-pages branch.

Configure GitHub Pages to serve from gh-pages.

No external hosting or paid services.

External links (other repos)

On the Explore Materials page:

Prominently link to curriculum, docs, or notebook repos.

Do NOT compile or import those sites into this build yet.

Reference patterns from 2i2c

Emulate:

Clear hero messaging

Modular sections

Strong CTAs

Minimal navigation

Clean footer with mission + links

Do not copy branding; only structure and interaction patterns.

Acceptance criteria

This repo is complete when:

All required pages exist and are linked in the navbar

Homepage is assembled entirely from reusable blocks

Repeated content is data-driven via YAML

SCSS is easy to customize

GitHub Pages deploy succeeds

Mobile layout is solid and accessible

Users are clearly guided to:

Partner With Us

Explore Materials

Contact