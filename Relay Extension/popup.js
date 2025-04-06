// Replay Extension/popup.js

const summaryElem = document.getElementById("summary");
const messageElem = document.getElementById("message");
const copyButton = document.getElementById("copy-button");
const settingsButton = document.getElementById("open-settings-button");
const generateButton = document.getElementById("generate-button");
const optionsContainer = document.getElementById("request-options");
const customPromptContainer = document.getElementById("custom-prompt-container");
const customPromptInput = document.getElementById("custom-prompt-input");
const closeButton = document.getElementById("close-popup-button");
const generatedMessageSection = document.getElementById("generated-message-section");
const generatedMessageHeader = document.getElementById("generated-message-header");

// Store fetched details globally in the popup scope
let currentProfileData = null;
let currentUserDetails = null;
let currentSummary = null;

// --- !!! IMPORTANT: User Implementation Required !!! ---
// --- Helper: Get Profile Data ---
// You need to implement the logic to retrieve profile data from the current LinkedIn page.
// This function should return a Promise that resolves with an object containing
// the necessary profile details (e.g., name, about, experience, education etc.).
// See where 'currentProfileData' is used in the 'initialize' and 'generateSelectedMessage'
// functions to understand which data fields are expected by the summary generation prompt.
// Return null or reject the promise if data cannot be retrieved.
// WARNING: Scraping data from websites like LinkedIn may violate their Terms of Service.
// Ensure your implementation complies with LinkedIn's policies.
async function getUserImplementedProfileData() {
  return new Promise((resolve, reject) => {
    // --- START: USER IMPLEMENTATION AREA ---

    // Placeholder - Replace with your actual data retrieval logic.
    // You might use chrome.scripting.executeScript or other methods here.
    console.warn("Relay Extension: getUserImplementedProfileData() needs to be implemented by the user.");

    // Simulate fetching data (replace with actual scraping/fetching)
    setTimeout(() => {
       // Resolve with null if data can't be fetched, or resolve with the data object.
       // Example: resolve(null);
       // Example: resolve({ name: "...", about: "...", experience: "...", ... });
       resolve(null); // Defaulting to null for the placeholder

    }, 500);

    // --- END: USER IMPLEMENTATION AREA ---
  });
}
// --- End: User Implementation Required ---


// --- Helper: Get User Details from Storage ---
async function getUserDetails() {
    return new Promise((resolve) => {
        chrome.storage.local.get({ user_personal_details: "" }, (data) => {
            resolve(data.user_personal_details);
        });
    });
}

// --- Function to toggle collapsible section ---
function toggleMessageSection() {
    if (generatedMessageSection && generatedMessageHeader) {
        const isCollapsed = generatedMessageSection.classList.toggle('collapsed');
        generatedMessageHeader.setAttribute('aria-expanded', !isCollapsed);
    } else { console.error("Could not find message section/header for toggle."); }
}

// --- Function to explicitly expand the collapsible section ---
function expandMessageSection() {
    if (generatedMessageSection && generatedMessageHeader) {
        if (generatedMessageSection.classList.contains('collapsed')) {
             generatedMessageSection.classList.remove('collapsed');
             generatedMessageHeader.setAttribute('aria-expanded', 'true');
        }
    } else { console.error("Could not find message section/header for expand."); }
}

// --- Function to handle message generation request ---
function generateSelectedMessage() {
    // Ensure profile data and summary were successfully loaded before proceeding
    if (!currentProfileData) {
         messageElem.value = "Error: Profile data not loaded. Implement data fetching in popup.js."; messageElem.disabled = true; expandMessageSection(); return;
    }
     if (!currentSummary || currentSummary.startsWith("Error:")) {
        messageElem.value = "Cannot generate message, summary is invalid or missing."; messageElem.disabled = true; expandMessageSection(); return;
    }

    const selectedOption = optionsContainer.querySelector('input[name="messageType"]:checked');
    if (!selectedOption) {
        messageElem.value = "Please select message type."; messageElem.disabled = true; expandMessageSection(); return;
    }
    const mode = selectedOption.value;
    let customPromptText = "";
    if (mode === "custom") {
        customPromptText = customPromptInput.value.trim();
        if (!customPromptText) {
            messageElem.value = "Please enter custom instructions..."; customPromptInput.style.border = '1px solid red';
            setTimeout(() => { customPromptInput.style.border = '1px solid #DEDDDB'; }, 1500);
            messageElem.disabled = true; expandMessageSection(); return;
        }
    }
    messageElem.value = "Generating message..."; messageElem.disabled = true; copyButton.disabled = true; generateButton.disabled = true;
    expandMessageSection();
    // Pass necessary data to background script
    chrome.runtime.sendMessage({
        type: "generate_connection_message",
        summary: currentSummary, // Pass the generated summary
        userDetails: currentUserDetails, // Pass stored user details
        mode: mode,
        customPrompt: customPromptText
        // Note: We don't pass currentProfileData directly here anymore unless needed by the specific message prompt
    }, (resMessage) => {
        generateButton.disabled = false;
        if (chrome.runtime.lastError || !resMessage?.message || resMessage.message.startsWith("Error")) {
            const errorMsg = chrome.runtime.lastError?.message || resMessage?.message || "No response";
            console.error("Popup: Error receiving generated message:", errorMsg);
            messageElem.value = `Error: ${errorMsg}`; messageElem.disabled = true; copyButton.disabled = true;
        } else {
            messageElem.value = resMessage.message; messageElem.disabled = false; copyButton.disabled = false;
            resetCopyButtonState();
        }
    });
}

// --- Function to handle radio button changes ---
function handleOptionChange() {
    const selectedOption = optionsContainer.querySelector('input[name="messageType"]:checked');
    customPromptContainer.style.display = (selectedOption && selectedOption.value === 'custom') ? 'block' : 'none';
}

// --- Initialization ---
async function initialize() {
    summaryElem.innerHTML = ''; summaryElem.classList.remove('loaded', 'error');
    summaryElem.textContent = "Fetching profile data..."; // Initial status

    // Add Lottie Loader
    try {
        const player = document.createElement('lottie-player');
        const lottieURL = chrome.runtime.getURL('lottie/loader.json');
        player.setAttribute('src', lottieURL);
        player.setAttribute('background', 'transparent');
        player.setAttribute('speed', '1');
        player.style.width = '160px';
        player.style.height = '160px';
        player.loop = true;
        player.autoplay = true;
        player.id = 'lottie-loader';
        summaryElem.innerHTML = '';
        summaryElem.appendChild(player);
    } catch (e) { console.error("Popup: Failed to create Lottie player", e); summaryElem.innerText = "Loading..."; summaryElem.classList.add('error'); }

    // Disable sections initially
    messageElem.disabled = true;
    messageElem.value = '';
    copyButton.disabled = true;
    generateButton.disabled = true;
    optionsContainer.querySelectorAll('input[type="radio"]').forEach(rb => rb.disabled = true);
    customPromptContainer.style.display = 'none';
    if (generatedMessageSection && !generatedMessageSection.classList.contains('collapsed')) generatedMessageSection.classList.add('collapsed');
    if (generatedMessageHeader) generatedMessageHeader.setAttribute('aria-expanded', 'false');

    // Fetch user details from storage and profile data (via user implementation)
    try {
        [currentProfileData, currentUserDetails] = await Promise.all([ getUserImplementedProfileData(), getUserDetails() ]);
    } catch (error) {
        console.error("Popup: Failed to get initial data:", error);
         const loader = summaryElem.querySelector('#lottie-loader');
         if (loader) loader.remove();
        summaryElem.innerText = `Error initializing: ${error.message || 'Could not get data.'}`;
        summaryElem.classList.add('error');
        return; // Stop initialization if fetching fails
    }


    const loader = summaryElem.querySelector('#lottie-loader');
    if (!currentProfileData) {
        if (loader) loader.remove();
        summaryElem.innerText = "Error: Profile data not available. Please implement data fetching in getUserImplementedProfileData().";
        summaryElem.classList.add('error');
        return;
    }

     // Now that we potentially have profile data, update status and request summary
    summaryElem.textContent = "Generating profile summary..."; // Update status

    // Request Summary from background script
    chrome.runtime.sendMessage({ type: "get_summary", data: currentProfileData }, (resSummary) => {
        if (loader) loader.remove(); else summaryElem.innerHTML = '';

        if (chrome.runtime.lastError || !resSummary?.summary || resSummary.summary.startsWith("Error")) {
            const errorMsg = chrome.runtime.lastError?.message || resSummary?.summary || "No response";
            console.error("Popup: Error receiving summary:", errorMsg);
            summaryElem.innerText = `Error generating summary: ${errorMsg}`;
            summaryElem.classList.add('error'); summaryElem.classList.remove('loaded');
            currentSummary = `Error: ${errorMsg}`; // Store error state
        } else {
            currentSummary = resSummary.summary;
            summaryElem.innerText = currentSummary;
            summaryElem.classList.add('loaded'); summaryElem.classList.remove('error');
            // Enable controls now that summary is ready
            generateButton.disabled = false;
            optionsContainer.querySelectorAll('input[type="radio"]').forEach(rb => rb.disabled = false);
            handleOptionChange(); // Update visibility of custom prompt input
        }
    });
}


// --- Copy Button State Management ---
let copyTimeoutId = null;

function setCopyButtonState(isCopied) {
    const copyIcon = copyButton.querySelector('.icon-copy');
    const copiedIcon = copyButton.querySelector('.icon-copied');
    const textSpan = copyButton.querySelector('.text');

    if (isCopied) {
        copyButton.classList.add('copied');
        if (textSpan) textSpan.innerText = "Copied!";
        if (copyIcon) copyIcon.style.display = 'none';
        if (copiedIcon) copiedIcon.style.display = 'inline-block';
    } else {
        copyButton.classList.remove('copied');
        if (textSpan) textSpan.innerText = "Copy";
        if (copyIcon) copyIcon.style.display = 'inline-block';
        if (copiedIcon) copiedIcon.style.display = 'none';
    }
}

function resetCopyButtonState() {
     if (copyTimeoutId) {
        clearTimeout(copyTimeoutId);
        copyTimeoutId = null;
    }
    setCopyButtonState(false);
}


// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {

  copyButton?.addEventListener("click", () => {
      if (copyButton.disabled || copyTimeoutId) return;

      messageElem.select();
      navigator.clipboard.writeText(messageElem.value)
        .then(() => {
            setCopyButtonState(true);
            copyTimeoutId = setTimeout(() => {
                resetCopyButtonState();
            }, 1500);
        })
        .catch(err => {
            console.error("Popup: Copy failed:", err);
            const textSpan = copyButton.querySelector('.text');
            const originalText = textSpan ? textSpan.innerText : 'Copy';
            if (textSpan) textSpan.innerText = "Failed!";
             copyTimeoutId = setTimeout(() => {
                 if (textSpan) textSpan.innerText = originalText;
                 copyTimeoutId = null;
             }, 1500);
        });
  });

  settingsButton?.addEventListener("click", () => { chrome.runtime.openOptionsPage(); });
  generateButton?.addEventListener("click", generateSelectedMessage);
  optionsContainer?.addEventListener('change', handleOptionChange);
  generatedMessageHeader?.addEventListener('click', toggleMessageSection);
  closeButton?.addEventListener('click', () => window.close());
  initialize();
});