# Publish targets

The shared copy is either a Google Slides presentation or a Figma Slides file. The local viewer is not a publish target.

| Target | Flag | Shared URL | metadata `canonical.target` |
|---|---|---|---|
| Google Slides | `--target google` | `https://docs.google.com/presentation/d/.../edit` | `google-slides` |
| Figma Slides | `--target figma` | `https://www.figma.com/slides/...` | `figma-slides` |

Google Slides is written by `scripts/publish-google.mjs`. Figma Slides starts from the plan in `scripts/publish-figma.mjs`, then the Figma connection creates or updates the file. See [figma-publish.md](figma-publish.md).

`status: "published"` means that URL is the copy to share. The markdown in `slides/` is still what a later edit starts from. Set `status` back to `draft` when the markdown changes, and keep `canonical` so the viewer can point at the last shared copy.
