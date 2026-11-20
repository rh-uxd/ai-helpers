const panel = document.querySelector<HTMLElement>('.resizable-panel');

export function showPanel(width: number) {
  if (!panel) {
    return;
  }

  panel.style.display = 'block';
  panel.style.width = `${width}%`;
}