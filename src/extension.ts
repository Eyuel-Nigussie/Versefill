import * as vscode from 'vscode';
import axios from 'axios';

async function generateAIPoweredVerseFill(wordCount: number): Promise<string> {
	const PROXY_URL = "https://versefill-proxy.eyuel.workers.dev";
	try {
		const model = "meta-llama/llama-3-8b-instruct";
		const messages = [
			{ role: "system", content: "You are a helpful assistant that generates Bible-based placeholder text." },
			{ role: "user", content: `Generate a single paragraph of exactly ${wordCount} words using real Bible verses or phrases. The result must be meaningful, coherent, and resemble a natural passage of scripture. Ensure the text reads smoothly, even if multiple verses are blended. Do not include verse numbers or quotation marks.` }
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
		let result = data.choices?.[0]?.message?.content || '';
		// Remove leading/trailing quotes and trim
		result = result.trim().replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
		// Enforce word count as close a
		const words = result.split(/\s+/);
		if (words.length > wordCount) {
			result = words.slice(0, wordCount).join(' ');
		} else if (words.length < wordCount) {
			// Optionally, pad with "..." if too short
			result = words.join(' ') + ' ...';
		}
		return result;
	} catch (error) {
		console.error('Error generating AI-powered text:', error);
		return 'Error generating text. Please try again.';
	}
}

export function activate(context: vscode.ExtensionContext) {
	// Automatic keyword trigger inside the document
	const disposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
		const editor = vscode.window.activeTextEditor;
		console.log('onDidChangeTextDocument fired');
		if (!editor) {
			console.log('No active editor');
			return;
		}
		if (event.document !== editor.document) {
			console.log('Changed document is not the active editor document');
			return;
		}
		const text = editor.document.getText();
		console.log('Current document text:', text);
		const match = text.match(/versefill(\d+)/);
		console.log('Regex match:', match);
		if (match && match.index !== undefined) {
			console.log('Trigger keyword found at index:', match.index);
			const wordCount = parseInt(match[1], 10);
			console.log('Parsed wordCount:', wordCount);
			if (!isNaN(wordCount) && wordCount > 0) {
				console.log('Valid wordCount, calling generateAIPoweredVerseFill');
				const generatedText = await generateAIPoweredVerseFill(wordCount);
				const edit = new vscode.WorkspaceEdit();
				const range = new vscode.Range(
					editor.document.positionAt(match.index),
					editor.document.positionAt(match.index + match[0].length)
				);
				edit.replace(editor.document.uri, range, generatedText);
				await vscode.workspace.applyEdit(edit);
				console.log('Applied edit to document');
			}
		}
	});

	context.subscriptions.push(disposable);

	// Manual command trigger from Command Palette or Keybinding
	const manualVersefillCommand = vscode.commands.registerCommand('versefill.manual', async (args) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		const command = args?.command || '';
		const match = command.match(/versefill(\d+)/);
		const wordCount = match && match[1] ? parseInt(match[1], 10) : 10;

		if (!isNaN(wordCount) && wordCount > 0) {
			try {
				const text = await generateAIPoweredVerseFill(wordCount);
				editor.edit((editBuilder) => {
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