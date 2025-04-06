// Replay Extension/settings.js

document.addEventListener("DOMContentLoaded", () => {
    const personalInput = document.getElementById("user-details");
    const summaryPromptInput = document.getElementById("custom-summary-prompt"); // NEW input
    const saveBtn = document.getElementById("save");
    const statusEl = document.getElementById("status");

    // Define storage keys
    const personalDetailsKey = "user_personal_details";
    const customSummaryPromptKey = "custom_summary_prompt";

    // Default values if nothing is stored yet
    const defaultSettings = {
        [personalDetailsKey]: "",
        [customSummaryPromptKey]: "" // Default custom prompt is empty
    };

    // Load existing settings
    chrome.storage.local.get(defaultSettings, (data) => {
      personalInput.value = data[personalDetailsKey];
      summaryPromptInput.value = data[customSummaryPromptKey]; // Load summary prompt
      console.log("Loaded settings:", data);
    });

    // Save updated settings
    saveBtn.addEventListener("click", () => {
      const user_details = personalInput.value.trim();
      const custom_summary_prompt = summaryPromptInput.value.trim(); // Get custom prompt value

      const newSettings = {
          [personalDetailsKey]: user_details,
          [customSummaryPromptKey]: custom_summary_prompt // Save custom prompt
      };

      statusEl.textContent = "Saving...";

      chrome.storage.local.set(newSettings, () => {
        console.log("Settings saved:", newSettings);
        statusEl.textContent = "✅ Settings saved!";
        setTimeout(() => (statusEl.textContent = ""), 2500);
      });
    });
});