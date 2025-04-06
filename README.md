# Relay - LinkedIn Assistant Chrome Extension

## Overview

Relay is a Chrome extension framework designed to assist with LinkedIn networking. It provides a UI and backend logic to connect with the OpenAI API (using model gpt-4o) for generating profile summaries and drafting personalized messages based on profile data **that you provide** via your own implementation.

**Note:** This public version **does not include** LinkedIn profile scraping logic. You must implement the profile data retrieval yourself.

## Features

* Provides UI for displaying profile summaries and generated messages.
* Connects to the OpenAI API to generate summaries and personalized messages.
* Requires user implementation for fetching profile data from a LinkedIn page.
* Settings page for personal details and custom summary prompts.

## Installation

1.  **Download/Clone:** Get the code onto your local machine.
2.  **Configure API Key:** **IMPORTANT:** Open `background.js` and replace `"YOUR_OPENAI_API_KEY_HERE"` with your actual OpenAI API key.
3.  **Implement Data Fetching:** **IMPORTANT:**
    * Open `popup.js` and find the `getUserImplementedProfileData` function.
    * **You must add your own code here** to get the profile data (like name, experience, etc.) from the current LinkedIn page. Check the comments in that function for guidance on the expected data format.
    * **Warning:** Be aware that automatically extracting data from websites like LinkedIn might violate their Terms of Service.
4.  **Load Extension in Chrome:**
    * Go to `chrome://extensions/`.
    * Enable "Developer mode".
    * Click "Load unpacked" and select the `Replay Extension` folder.

## Configuration

* **OpenAI API Key:** Add your key to `background.js` (Installation Step 2).
* **Data Fetching Logic:** Add your code to `popup.js` (Installation Step 3).
* **Personal Details & Summary Prompt:** Use the extension's "Settings" page (accessible via the popup footer) to add your details and optionally customize the summary prompt.

## Usage

1.  Go to a LinkedIn profile page.
2.  Click the Relay extension icon.
3.  Your implemented logic will fetch data, and a summary will be generated.
4.  Select a message type, optionally add a custom prompt, and click "Generate".
5.  Click "Copy" to copy the generated message.

## Notes

* The extension's reliability depends on the data fetching logic **you implement**.
* Ensure you have a valid OpenAI API key. Protect your key.
