import * as vscode from "vscode";

import {
  Editor,
  Code,
  Modification,
  Command,
  ErrorReason,
  errorReasonToString,
  Choice
} from "../editor";
import { Selection } from "../selection";
import { Position } from "../position";

export { VueVSCodeEditor };

class VueVSCodeEditor implements Editor {
  private editor: vscode.TextEditor;
  private document: vscode.TextDocument;

  constructor(editor: vscode.TextEditor) {
    this.editor = editor;
    this.document = editor.document;
  }

  get code(): Code {
    const fullCode = this.document.getText();
    const openingScriptTagPosition = fullCode.indexOf("<script>");
    const closingScriptTagPosition = fullCode.indexOf("</script>");
    const code = fullCode.slice(
      openingScriptTagPosition + "<script>".length,
      closingScriptTagPosition
    );
    return code;
  }

  get selection(): Selection {
    const fullCode = this.document.getText();
    const openingScriptTagPosition = fullCode.indexOf("<script>");
    const offsetCode = fullCode.slice(
      0,
      openingScriptTagPosition + "<script>".length
    );
    const fullCodeWithLines = offsetCode.split("\n");
    const lastLine = fullCodeWithLines.length - 1;

    const vsCodeSelection = createSelectionFromVSCode(this.editor.selection);

    return Selection.fromPositions(
      vsCodeSelection.start.addLines(-lastLine),
      vsCodeSelection.end.addLines(-lastLine)
    );
  }

  async write(code: Code, newCursorPosition?: Position): Promise<void> {
    // TODO: replace code in script tags when we write
    // We need to register initial position BEFORE we update the document.
    const cursorAtInitialStartPosition = new vscode.Selection(
      this.editor.selection.start,
      this.editor.selection.start
    );

    const edit = new vscode.WorkspaceEdit();
    const allDocumentRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(this.document.lineCount, 0)
    );

    edit.set(this.document.uri, [new vscode.TextEdit(allDocumentRange, code)]);

    await vscode.workspace.applyEdit(edit);

    // Put cursor at correct position
    this.editor.selection = newCursorPosition
      ? toVSCodeCursor(newCursorPosition)
      : cursorAtInitialStartPosition;

    // Scroll to correct position if it changed
    if (newCursorPosition) {
      const position = toVSCodePosition(newCursorPosition);
      this.editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.Default
      );
    }
  }

  async readThenWrite(
    selection: Selection,
    getModifications: (code: Code) => Modification[],
    newCursorPosition?: Position
  ): Promise<void> {
    // TODO: replace code in script tags when we write
    const startPosition = toVSCodePosition(selection.start);
    const endPosition = toVSCodePosition(selection.end);

    const readCode = this.document.getText(
      new vscode.Range(startPosition, endPosition)
    );

    const textEdits = getModifications(readCode).map(({ code, selection }) => {
      const startPosition = toVSCodePosition(selection.start);
      const endPosition = toVSCodePosition(selection.end);

      return new vscode.TextEdit(
        new vscode.Range(startPosition, endPosition),
        code
      );
    });

    const edit = new vscode.WorkspaceEdit();
    edit.set(this.document.uri, textEdits);

    await vscode.workspace.applyEdit(edit);

    if (newCursorPosition) {
      this.editor.selection = toVSCodeCursor(newCursorPosition);
    }
  }

  async delegate(command: Command) {
    await vscode.commands.executeCommand(toVSCodeCommand(command));
  }

  async showError(reason: ErrorReason) {
    await vscode.window.showErrorMessage(errorReasonToString(reason));
  }

  async askUser<T>(choices: Choice<T>[]) {
    return await vscode.window.showQuickPick(choices);
  }

  moveCursorTo(position: Position) {
    // TODO: offset selection accordingly
    this.editor.selection = toVSCodeCursor(position);
    return Promise.resolve();
  }
}

function createSelectionFromVSCode(
  selection: vscode.Selection | vscode.Range
): Selection {
  return new Selection(
    [selection.start.line, selection.start.character],
    [selection.end.line, selection.end.character]
  );
}

function toVSCodeCursor(position: Position): vscode.Selection {
  return new vscode.Selection(
    toVSCodePosition(position),
    toVSCodePosition(position)
  );
}

function toVSCodePosition(position: Position): vscode.Position {
  return new vscode.Position(position.line, position.character);
}

function toVSCodeCommand(command: Command): string {
  switch (command) {
    case Command.RenameSymbol:
      return "editor.action.rename";

    default:
      return "";
  }
}
