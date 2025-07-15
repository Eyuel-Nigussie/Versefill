# VerseFill

VerseFill is a Visual Studio Code extension that generates meaningful, Bible-inspired placeholder text—just like Lorem Ipsum, but with spiritual depth. Type `versefill<number>` (e.g., `versefill20`) in your document, or use the command palette, and VerseFill will replace it with a coherent, Bible-based paragraph of approximately that many words.

## Features
- Generate Bible-inspired placeholder paragraphs for any word count
- Works in any text-based file
- Command palette and keyboard shortcut support
- Customizable settings for including references

## Usage
- Type `versefill<number>` in your document (e.g., `versefill30`)
- Save or make a change to trigger automatic replacement
- Or run the command `Versefill: Generate Bible-based Placeholder Text` from the Command Palette (`Ctrl+Shift+P`)
- Use the keyboard shortcut `Ctrl+Alt+V` to trigger the command

## Requirements
- Requires an API key for Gemini (Google Generative Language API)
- Add your API key to a `.env` file in your project root:
  ```
  OPENAI_API_KEY=your_gemini_api_key_here
  ```

## Extension Settings
- `versefill.includeReferences`: Include Bible verse references in the generated text (default: false)

## Known Issues
- Generated text is AI-generated and not actual scripture
- Requires internet connection for API calls
<!-- Next-Up
## Release Notes
### 1.1.0
- Improved prompt for coherent Bible-based paragraphs
- Added keyboard shortcut and command palette support -->

### 1.0.0
- Initial release: basic placeholder text generation

**Enjoy using VerseFill to add spiritual inspiration to your mockups and documents!**
