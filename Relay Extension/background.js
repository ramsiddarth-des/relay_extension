// Replay Extension/background.js

// Store securely in a real application!
const OPENAI_KEY = "YOUR_OPENAI_API_KEY_HERE";
const OPENAI_MODEL = "gpt-4o";
const FETCH_TIMEOUT = 20000; // 20 seconds timeout

// Define storage key for summary prompt consistency
const CUSTOM_SUMMARY_PROMPT_KEY = "custom_summary_prompt";

// Helper function for OpenAI API call with timeout and error handling
async function callOpenAI(messages) {
  const controller = new AbortController();
  const signal = controller.signal;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      controller.abort();
      reject(new Error(`OpenAI request timed out after ${FETCH_TIMEOUT / 1000} seconds`));
    }, FETCH_TIMEOUT)
  );

  console.log("Background: Calling OpenAI...");
  try {
    const response = await Promise.race([
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: messages,
          // temperature: 0.7 // Optional
        }),
        signal
      }),
      timeoutPromise
    ]);

    console.log("Background: OpenAI response status:", response.status);
    if (!response.ok) {
      let errorBody = await response.text(); let errorDetail = errorBody;
      try { const errorJson = JSON.parse(errorBody); errorDetail = errorJson.error?.message || errorBody; } catch(e) {}
      console.error("Background: OpenAI fetch failed:", response.status, response.statusText, errorDetail);
      throw new Error(`API Error ${response.status}: ${errorDetail}`);
    }
    const data = await response.json();
    console.log("Background: OpenAI data received.");
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
        console.error("Background: OpenAI response missing expected content:", data);
        throw new Error("API response format incorrect or empty.");
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Background: Error during OpenAI call processing:", error);
    throw error;
  }
}

// --- Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background: Received message:", request.type);

  let responseSent = false;
  const respondOnce = (response) => {
      if (!responseSent) { sendResponse(response); responseSent = true; }
      else { console.warn("Background: Attempted sendResponse more than once for:", request.type); }
  };

  // 1. Handle Summary Request (MODIFIED TO USE CUSTOM PROMPT)
  // Make the handler effectively async to await storage access
  if (request.type === "get_summary") {
    (async () => {
        const profileData = request.data;
        if (!profileData || !profileData.name) {
            console.error("Background: Received invalid profile data for summary (name missing).");
            respondOnce({ summary: "Error: Invalid profile data received from page."});
            return; // Exit async function
        }

        let finalPrompt = "";
        // Format profile data once
        const profileDataString = `Name: ${profileData.name || 'N/A'}\nAbout: ${profileData.about || 'N/A'}\nExperience: ${profileData.experience || 'N/A'}\nEducation: ${profileData.education || 'N/A'}\nProjects: ${profileData.projects || 'N/A'}\nSkills: ${profileData.skills || 'N/A'}\nCourses: ${profileData.courses || 'N/A'}\nActivities: ${profileData.activities || 'N/A'}`;

        try {
            // Retrieve custom prompt from storage
            const settings = await chrome.storage.local.get({ [CUSTOM_SUMMARY_PROMPT_KEY]: "" }); // Provide default
            const customSummaryPrompt = settings[CUSTOM_SUMMARY_PROMPT_KEY]?.trim();

            if (customSummaryPrompt) {
                console.log("Background: Using custom summary prompt.");
                // Replace placeholder in custom prompt with actual profile data
                if (customSummaryPrompt.includes("{{PROFILE_DATA}}")) {
                     finalPrompt = customSummaryPrompt.replace("{{PROFILE_DATA}}", profileDataString);
                } else {
                    // If placeholder missing, append data (less ideal)
                    console.warn("Background: Custom summary prompt missing '{{PROFILE_DATA}}' placeholder. Appending data.");
                    finalPrompt = `${customSummaryPrompt}\n\nProfile Data:\n${profileDataString}`;
                }
            } else {
                console.log("Background: Using default summary prompt.");
                // Use the default detailed prompt if custom one is empty
                finalPrompt = `Generate a clear and professional summary (2–3 short paragraphs) using only the structured data provided from a LinkedIn profile. Focus on the person’s current role, key work experiences, education, and any notable projects or skills. Avoid speculation or generic filler—summarize naturally and accurately based on the data. Use a neutral, professional tone suitable for a networking or recruiting context.\n\nProfile Data:\n${profileDataString}\n\nGenerate the summary:`;
            }

            console.log("Background: Preparing summary request with final prompt.");
            const summary = await callOpenAI([{ role: "user", content: finalPrompt }]);

            if (summary) {
              console.log("Background: Summary generated. Sending response.");
              respondOnce({ summary: summary.trim() });
            } else {
              console.error("Background: OpenAI returned null summary content.");
              respondOnce({ summary: "Error: Failed to generate summary content (null)." });
            }

        } catch (error) {
            console.error("Background: Catching summary generation error (incl. storage fetch).");
            respondOnce({ summary: `Error: ${error.message || 'Unknown summary generation error.'}` });
        }
    })(); // Immediately invoke the async function

    return true; // Indicate async response expected from the async function
  }

  // 2. Handle Connection Message Request (No changes needed here from previous version)
  if (request.type === "generate_connection_message") {
        (async () => {
            const summary = request.summary;
            const userDetails = request.userDetails || "";
            const mode = request.mode || "connection";
            const customPromptText = request.customPrompt || "";

            if (!summary || summary.startsWith("Error")) { respondOnce({ message: "Error: Invalid summary provided." }); return; }

            let prompt = "";
            const baseInstructions = `You are drafting a short, friendly, professional LinkedIn message (3-5 sentences, max 300 chars).\nContext:\n- Recipient's Profile Summary: Provided below.\n- Sender's Details (Me): Provided below.\nTask:\n1. Analyze BOTH summary and details.\n2. Identify ONE specific, relevant commonality (shared company, school, skill, interest, location etc.) if possible.\n3. Incorporate this commonality NATURALLY into the message.\n4. If no clear commonality, mention something specific and positive from their summary.\n5. Sign off using the sender's name if provided in 'My Details'.\n6. DO NOT use placeholders like [Your Name], [Company], [Skill]. Be concise and ready to send.\n\nMy Details (Sender):\n${userDetails || 'Not Provided'}\n\nRecipient's Profile Summary:\n${summary}\n\n`;

            if (mode === "referral") { prompt = baseInstructions + `Specific Goal: Politely ask for a referral or connection to the hiring manager...\n\nDraft the referral request message now:`; }
            else if (mode === "custom") { if (!customPromptText) { respondOnce({ message: "Error: Custom prompt empty."}); return; } prompt = `Act as an AI assistant drafting a LinkedIn message... Prioritize following 'User's Custom Instructions'...\n\nUser's Custom Instructions:\n${customPromptText}\n\nRecipient's Profile Summary (Context):\n${summary}\n\nMy Details (Sender - Context):\n${userDetails || 'Not provided.'}\n\nDraft the message now...:`; }
            else { prompt = baseInstructions + `Specific Goal: Write a general connection request...\n\nDraft the connection message now:`; }

            console.log(`Background: Preparing message request. Mode: ${mode}`);
            try {
                const message = await callOpenAI([{ role: "user", content: prompt }]);
                if (message) { respondOnce({ message: message.trim() }); }
                else { respondOnce({ message: "Error: Failed to generate message (null)." }); }
            } catch (error) {
                 respondOnce({ message: `Error: ${error.message || 'Unknown error.'}` });
            }
        })();
        return true; // Indicate async response
  }

  console.warn("Background: Unhandled message type received:", request.type);
});

console.log("Background script loaded (v2.7 custom summary prompt).");