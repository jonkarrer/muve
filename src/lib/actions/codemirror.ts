import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Action } from "svelte/action";

interface CodeMirrorParams {
  content: string;
  language?: any;
  readonly?: boolean;
  onchange?: (content: string) => void;
}

export const codemirror: Action<HTMLDivElement, CodeMirrorParams> = (node, params) => {
  let view: EditorView;

  function create(p: CodeMirrorParams) {
    const extensions = [
      basicSetup,
      oneDark,
      EditorState.readOnly.of(p.readonly ?? true),
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px" },
        ".cm-scroller": { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace" },
        ".cm-gutters": { background: "#0d1117", border: "none" },
      }),
    ];

    if (p.language) extensions.push(p.language);

    if (p.onchange) {
      extensions.push(EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          p.onchange!(update.state.doc.toString());
        }
      }));
    }

    view = new EditorView({
      state: EditorState.create({ doc: p.content, extensions }),
      parent: node,
    });
  }

  create(params);

  return {
    update(newParams: CodeMirrorParams) {
      if (newParams.content !== view.state.doc.toString()) {
        view.destroy();
        create(newParams);
      }
    },
    destroy() {
      view.destroy();
    },
  };
};
