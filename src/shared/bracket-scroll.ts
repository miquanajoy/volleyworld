const scopes = new WeakMap<HTMLElement, string>();
const containers = [
  ".playoff-tree-scroll",
  ".double-lower-scroll",
  ".full-bracket",
];
/** Replacing the bracket DOM must not send a player back to its first column. */
export function preserveBracketScroll(
  root: HTMLElement,
  scope: string,
  render: () => void,
): void {
  const positions =
    scopes.get(root) === scope
      ? containers.flatMap((selector) =>
          Array.from(root.querySelectorAll?.<HTMLElement>(selector) || []).map(
            (element, index) => ({
              selector,
              index,
              left: element.scrollLeft,
              top: element.scrollTop,
            }),
          ),
        )
      : [];
  try {
    render();
  } finally {
    scopes.set(root, scope);
    for (const position of positions) {
      const element = root.querySelectorAll?.<HTMLElement>(position.selector)[
        position.index
      ];
      if (element) {
        element.scrollLeft = position.left;
        element.scrollTop = position.top;
      }
    }
  }
}
