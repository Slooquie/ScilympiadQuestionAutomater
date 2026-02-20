# Scilympiad Test Uploader Extension

A Chrome Extension designed to automate the process of uploading test questions (from PDFs or text) directly into the Scilympiad platform.

## Features

- **Automated PDF Parsing:** Uses the Gemini SDK to intelligently extract questions, multiple-choice options, correct answers, and points from test PDFs and answer keys.
- **Image Support:** Allows you to attach images (via upload or pasting directly from your clipboard) to questions that require diagrams or graphs.
- **Review & Edit Output:** Provides a spreadsheet-like preview interface where you can review the parsed questions, fix typos, set correct answers, and attach images before uploading.
- **Automated Form Filling:** Automatically navigates the Scilympiad test creation form, selects the correct question type, injects the question and its options into the Summernote rich-text editors, fills points, and selects the correct answer.
- **Persistent State:** Can survive page reloads and automatically resume where it left off.
- **Self-Healing Automation:** Automatically recovers from disconnected extension contexts due to extension updates or page resets.

## Installation

As this extension is not published on the Chrome Web Store, you need to install it locally.

1. Download or clone this repository to your computer.
2. Open Google Chrome.
3. Open the Extensions management page by navigating to `chrome://extensions`.
4. Enable **Developer mode** by toggling the switch in the top right corner.
5. Click the **Load unpacked** button in the top left corner.
6. Select the folder containing this repository (it must be the folder that contains `manifest.json`).
7. The extension should now appear in your list of extensions.

## Usage

1. Click the extension icon in your Chrome toolbar.
2. Enter your Gemini API Key in the settings popup.
3. Select the desired Gemini Model (e.g., `gemini-1.5-pro` or `gemini-1.5-flash`).
4. Upload your test PDF and (optionally) your Answer Key PDF.
5. Click **Process PDF**.
6. The extension will parse your files and open a **Review Page** in a new tab.
7. On the Review Page:
   - Edit any question text, options, or points if needed.
   - Select the correct answer by clicking the radio button next to it.
   - Add images to questions by clicking "Add Image" or pasting directly (`Ctrl+V`) into the question row.
8. Click the green **Save & Start Upload to Scilympiad** button.
9. An automated Scilympiad tab will open.
10. If everything looks correct, click the **Start Upload** button to begin the automated injection process.
11. You can stop or clear the automation at any time using the on-screen buttons.

## Important Notes

- **API Limits:** Keep in mind the rate limits and pricing of your Gemini API key.
- **Accuracy:** Parsing PDFs is not perfectly accurate. **Always review the parsed data** on the Review Page before starting the final upload.
- **Scilympiad Platform Changes:** The DOM and UI logic of Scilympiad might change over time, potentially breaking the automation selectors.

## Disclaimer

This extension is provided as-is, without warranty of any kind. Use it at your own risk. This project is not affiliated with or endorsed by Scilympiad or Science Olympiad, Inc.
