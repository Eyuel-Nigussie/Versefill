import * as vscode from 'vscode';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
console.log('Gemini API Key:', apiKey);

if (!apiKey) {
	vscode.window.showErrorMessage('OPENAI_API_KEY is not set. Please set it in your environment or .env file.');
	throw new Error('OPENAI_API_KEY is not set.');
}

async function generateAIPoweredVerseFill(wordCount: number): Promise<string> {
	try {
		const response = await axios.post(
			'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
			{
				contents: [
					{
						parts: [
							{
								text: `Generate a Bible-based placeholder paragraph of exactly ${wordCount} words. The text should be meaningful, coherent, and resemble real Bible verses or phrases, but should not copy actual scripture. Output a single paragraph, not a list of words.`
							}
						]
					}
				]
			},
			{
				headers: {
					'Content-Type': 'application/json'
				},
				params: {
					key: apiKey
				}
			}
		);

		// Gemini's response structure
		const result = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
		return result.trim();
	} catch (error) {
		console.error('The API key is:', apiKey);
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
