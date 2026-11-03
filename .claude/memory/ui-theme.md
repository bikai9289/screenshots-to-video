# UI, responsive and theme

- Public header and mock top banner are fixed layers; account for `--top-banner-height` and keep the banner background fully opaque so scrolling content cannot bleed through.
- Preserve the established warm, subtle banner palette; avoid high-saturation yellow fills. Keep dark-mode colors explicit.
- Check desktop, tablet, and mobile layouts after workspace changes. Long labels and localized copy must wrap or truncate without breaking controls.
- Keep media cards consistent across image, video, and audio; support large-image preview and synchronized audio playback (starting one pauses others).
