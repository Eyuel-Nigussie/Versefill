import * as vscode from 'vscode';

async function generateAIPoweredVerseFill(wordCount: number): Promise<string> {
 const PROXY_URL = "https://versefill-proxy.eyuel.workers.dev";
 try {
  const model = "meta-llama/llama-3.1-8b-instruct";
  const messages = [
   { role: "system", content: "You are a helpful assistant that generates Bible-based placeholder text." },
   { role: "user", content: `Generate an exact! ${wordCount}-wordcount placeholder about grace, hope, biblical figures, bible stories or deep meanings portrayed. Do not reiterate, or use quotation marks.` }
  ];

  const response = await fetch(PROXY_URL, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
   throw new Error(await response.text());
  }

  const data: any = await response.json();
  let result = (data.choices?.[0]?.message?.content || '').trim();
  // Remove leading/trailing quotes and trim
  result = result.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
  // Enforce word count as closely as possible. Filter out empty tokens so
  // leading/trailing whitespace does not skew the count.
  const words = result.split(/\s+/).filter(Boolean);
  if (words.length > wordCount) {
   result = words.slice(0, wordCount).join(' ');
  } else {
   result = words.join(' ');
  }
  return result;
 } catch (error) {
  console.error('Error generating AI-powered text:', error);
  return 'Error generating text. Please try again.';
 }
}

interface VersefillToken {
 index: number;
 text: string;
 wordCount: number;
}

// Find a `versefillN` token at or immediately adjacent to the cursor, rather
// than blindly matching the first occurrence anywhere in the document.
function findTokenAtCursor(document: vscode.TextDocument, cursorOffset: number): VersefillToken | undefined {
 const text = document.getText();
 const regex = /versefill(\d+)/g;
 let match: RegExpExecArray | null;
 while ((match = regex.exec(text)) !== null) {
  const start = match.index;
  const end = start + match[0].length;
  if (cursorOffset >= start && cursorOffset <= end) {
   const wordCount = parseInt(match[1], 10);
   if (!isNaN(wordCount) && wordCount > 0) {
    return { index: start, text: match[0], wordCount };
   }
  }
 }
 return undefined;
}

// Locate the occurrence of `token` nearest to `preferredIndex` in the current
// text. Used to recompute a fresh, non-stale range after the async API call.
function findNearestIndex(text: string, token: string, preferredIndex: number): number {
 let best = -1;
 let bestDistance = Number.POSITIVE_INFINITY;
 let from = 0;
 for (;;) {
  const idx = text.indexOf(token, from);
  if (idx === -1) {
   break;
  }
  const distance = Math.abs(idx - preferredIndex);
  if (distance < bestDistance) {
   best = idx;
   bestDistance = distance;
  }
  from = idx + token.length;
 }
 return best;
}

export function activate(context: vscode.ExtensionContext) {
 let debounceTimer: ReturnType<typeof setTimeout> | undefined;
 let isProcessing = false; // prevents overlapping generation runs
 let isApplying = false;    // marks edits we make ourselves so we can ignore them

 async function handleTrigger(editor: vscode.TextEditor) {
  if (isProcessing) {
   return;
  }
  const document = editor.document;
  const cursorOffset = document.offsetAt(editor.selection.active);
  const token = findTokenAtCursor(document, cursorOffset);
  if (!token) {
   return;
  }

  isProcessing = true;
  try {
   const generatedText = await generateAIPoweredVerseFill(token.wordCount);

   // The document may have changed while we awaited the network call, so the
   // original offsets can be stale. Recompute the token's position fresh.
   const currentText = document.getText();
   const freshIndex = findNearestIndex(currentText, token.text, token.index);
   if (freshIndex === -1) {
    // The token was edited/removed while we were generating; abort safely.
    return;
   }

   const range = new vscode.Range(
    document.positionAt(freshIndex),
    document.positionAt(freshIndex + token.text.length)
   );
   const edit = new vscode.WorkspaceEdit();
   edit.replace(document.uri, range, generatedText);

   isApplying = true;
   try {
    await vscode.workspace.applyEdit(edit);
   } finally {
    isApplying = false;
   }
  } finally {
   isProcessing = false;
  }
 }

 // Automatic keyword trigger inside the document (debounced + re-entrancy safe).
 const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
  if (isApplying) {
   return; // ignore edits produced by our own applyEdit
  }
  const editor = vscode.window.activeTextEditor;
  if (!editor || event.document !== editor.document) {
   return;
  }
  if (debounceTimer) {
   clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
   void handleTrigger(editor);
  }, 400);
 });

 context.subscriptions.push(disposable);
 context.subscriptions.push({
  dispose: () => {
   if (debounceTimer) {
    clearTimeout(debounceTimer);
   }
  }
 });

 // Manual command trigger from Command Palette or Keybinding
 const manualVersefillCommand = vscode.commands.registerCommand('versefill.manual', async (args) => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
   return;
  }

  const command = args?.command || '';
  const match = command.match(/versefill(\d+)/);
  const wordCount = match && match[1] ? parseInt(match[1], 10) : 10;

  if (!isNaN(wordCount) && wordCount > 0) {
   try {
    const text = await generateAIPoweredVerseFill(wordCount);
    await editor.edit((editBuilder) => {
     if (editor.selection.isEmpty) {
      editBuilder.insert(editor.selection.active, text);
     } else {
      editBuilder.replace(editor.selection, text);
     }
    });
   } catch (error) {
    vscode.window.showErrorMessage('VerseFill error: ' + (typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)));
   }
  } else {
   vscode.window.showErrorMessage('Invalid or missing word count.');
  }
 });

 context.subscriptions.push(manualVersefillCommand);
}

export function deactivate() {}
