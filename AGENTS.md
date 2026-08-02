# Project instructions

- IDs in inline SVGs are document-global. Every reusable `defs` resource such as a pattern, gradient, clip path, mask or filter must receive an ID that is unique per rendered SVG. Keep the matching `url(#...)` reference in that SVG; do not refer to a fixed fragment ID from shared CSS.
- Add a regression test that renders the SVG twice and verifies that both resource IDs differ and that each SVG refers to its own resource.
