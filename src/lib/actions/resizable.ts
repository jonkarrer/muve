import type { Action } from "svelte/action";

interface ResizableParams {
  direction: "horizontal" | "vertical";
  onresize: (delta: number) => void;
}

export const resizable: Action<HTMLDivElement, ResizableParams> = (node, params) => {
  let startPos = 0;
  let currentParams = params;

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    startPos = currentParams.direction === "horizontal" ? e.clientX : e.clientY;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = currentParams.direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function onMouseMove(e: MouseEvent) {
    const current = currentParams.direction === "horizontal" ? e.clientX : e.clientY;
    const delta = current - startPos;
    startPos = current;
    currentParams.onresize(delta);
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  node.addEventListener("mousedown", onMouseDown);

  return {
    update(newParams: ResizableParams) {
      currentParams = newParams;
    },
    destroy() {
      node.removeEventListener("mousedown", onMouseDown);
    },
  };
};
