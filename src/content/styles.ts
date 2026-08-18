// Styles injected into the content-script Shadow DOM. Scoped by the shadow root,
// so nothing here can leak to (or be broken by) the host page.

export const shadowStyles = /* css */ `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

  .ai-btn {
    position: absolute;
    z-index: 2147483647;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #6d7cff, #7c5cff);
    border: none;
    border-radius: 999px;
    box-shadow: 0 4px 16px rgba(80, 70, 200, 0.35);
    cursor: pointer;
    user-select: none;
  }
  .ai-btn:hover { filter: brightness(1.07); }

  .ai-pop {
    position: absolute;
    z-index: 2147483647;
    width: 360px;
    max-width: calc(100vw - 24px);
    background: #ffffff;
    color: #1a1f2b;
    border: 1px solid #e3e7ef;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(20, 24, 40, 0.22);
    overflow: hidden;
  }
  @media (prefers-color-scheme: dark) {
    .ai-pop { background: #161b26; color: #e6edf6; border-color: #2a3346; }
    .ai-context { background: #1e2534 !important; color: #9fb0c6 !important; }
    .ai-input { background: #1e2534 !important; color: #e6edf6 !important; border-color: #2a3346 !important; }
    .ai-quick button { background: #1e2534 !important; color: #cdd8ea !important; border-color: #2a3346 !important; }
    .ai-answer pre { background: #0c111b !important; }
    .ai-answer code { background: #222b3d !important; }
  }

  .ai-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; font-size: 13px; font-weight: 700;
    border-bottom: 1px solid rgba(120,130,160,0.15);
  }
  .ai-head .close { cursor: pointer; opacity: .6; font-size: 16px; line-height: 1; background: none; border: none; color: inherit; }
  .ai-head .close:hover { opacity: 1; }

  .ai-context {
    margin: 10px 14px 0; padding: 8px 10px; font-size: 12px; line-height: 1.4;
    background: #f3f5fa; color: #5a6478; border-radius: 8px;
    max-height: 62px; overflow: hidden; position: relative;
  }

  .ai-quick { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 4px; }
  .ai-quick button {
    font-size: 12px; padding: 5px 10px; border-radius: 8px;
    background: #f1f3f9; color: #37415a; border: 1px solid #e3e7ef; cursor: pointer;
  }
  .ai-quick button:hover { filter: brightness(0.97); }

  .ai-form { display: flex; gap: 8px; padding: 8px 14px 14px; }
  .ai-input {
    flex: 1; font-size: 13px; padding: 9px 11px; border-radius: 10px;
    border: 1px solid #d9deea; background: #fff; color: #1a1f2b; resize: none; min-height: 20px;
  }
  .ai-input:focus { outline: 2px solid #7c5cff; outline-offset: 0; }
  .ai-send {
    align-self: flex-end; width: 36px; height: 36px; border-radius: 10px; border: none;
    background: linear-gradient(135deg, #6d7cff, #7c5cff); color: #fff; cursor: pointer; font-size: 15px;
  }
  .ai-send:disabled { opacity: .5; cursor: default; }

  .ai-answer { padding: 0 14px 14px; font-size: 13.5px; line-height: 1.55; max-height: 320px; overflow-y: auto; }
  .ai-answer:empty { display: none; }
  .ai-answer h1, .ai-answer h2, .ai-answer h3 { font-size: 14px; margin: 10px 0 6px; }
  .ai-answer p { margin: 8px 0; }
  .ai-answer ul { margin: 6px 0; padding-left: 20px; }
  .ai-answer code { background: #eef1f7; padding: 1px 5px; border-radius: 5px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  .ai-answer pre { background: #f3f5fa; padding: 10px; border-radius: 8px; overflow-x: auto; }
  .ai-answer pre code { background: none; padding: 0; }
  .ai-answer a { color: #6d7cff; }

  .ai-error { padding: 10px 14px 14px; font-size: 13px; color: #d1435b; }
  .ai-error a { color: #6d7cff; cursor: pointer; text-decoration: underline; }

  .ai-cursor::after { content: '▍'; opacity: .5; animation: blink 1s steps(2) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
`;
