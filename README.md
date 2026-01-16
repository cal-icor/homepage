# Cal-ICOR Homepage

The central website for Cal-ICOR (California Interactive Computing Open Resource) - a statewide initiative to expand equitable access to data science education across California's public higher education institutions.

## About Cal-ICOR

Cal-ICOR provides:
- Cloud-based JupyterHub environments for students and educators
- Open, modular curriculum materials for data science instruction
- Instructor support and professional development
- A collaborative network across UC, CSU, and CCC systems

**Website:** [https://cal-icor.org](https://cal-icor.org)

## Development

This site is built with [Hugo](https://gohugo.io/) and deployed via GitHub Pages.

### Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) (latest version recommended)

### Installing Hugo

**With Homebrew (macOS)**

```bash
brew install hugo
```


### Hugo Commands

```bash
# Start the development server
hugo server -D

# Build for production
hugo --minify
```

- Development server runs at `http://localhost:1313`
- Production build outputs to `public/` directory

## Project Structure

```
homepage/
├── content/           # Page content (Markdown)
│   ├── _index.md      # Homepage
│   ├── partner/       # Partner With Us page
│   ├── materials/     # Explore Materials page
│   ├── about/         # About page
│   └── contact/       # Contact page
├── data/              # Structured content (YAML)
│   ├── partners.yaml  # Partner institutions
│   ├── features.yaml  # Feature cards
│   ├── steps.yaml     # Timeline steps
│   ├── materials.yaml # Materials cards
│   ├── expectations.yaml # Partner expectations grid
│   └── vision.yaml    # About page vision grid
├── layouts/           # Hugo templates
│   ├── _default/      # Base templates
│   ├── partials/      # Reusable components
│   ├── partner/       # Partner page layout
│   ├── materials/     # Materials page layout
│   ├── about/         # About page layout
│   └── index.html     # Homepage layout
├── assets/scss/       # Stylesheets (SCSS)
├── static/            # Static files (images, logos)
├── hugo.yaml          # Hugo configuration
└── .github/workflows/ # GitHub Actions
```

## Updating Content

### Page Content

Edit the Markdown files in `content/` to update page text.

### Data-Driven Content

Edit the YAML files in `data/` to update:
- `partners.yaml` - Partner institution logos and links
- `features.yaml` - Homepage feature cards
- `steps.yaml` - "How to Get Started" timeline
- `materials.yaml` - Materials resource cards
- `expectations.yaml` - Partner page 2x2 grid
- `vision.yaml` - About page vision grid

### Styles

Edit SCSS files in `assets/scss/` to customize the design:
- `base/_variables.scss` - Colors, spacing, typography
- `components/` - Individual component styles

### Images

Add images to `static/images/`:
- Partner logos: `static/images/logos/partners/`
- Materials images: `static/images/materials/`

## Deployment

The site automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

## Related Resources

- [Cal-ICOR Documentation](https://docs.cal-icor.org)
- [Interactive Textbook](https://cal-icor.github.io/textbook)
- [JupyterHub](https://jupyter.cal-icor.org)
- [GitHub Organization](https://github.com/cal-icor)

## Contact

- **Email:** calicor@berkeley.edu
- **Interest Form:** [https://forms.gle/fH5HSAqzDyGpKVXs6](https://forms.gle/fH5HSAqzDyGpKVXs6)

## License

This project is open source. See individual files for specific licenses.
