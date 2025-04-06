function getLinkedInProfileData() {
    const nameElem = document.querySelector(".text-heading-xlarge");
    const titleElem = document.querySelector(".text-body-medium.break-words");
    const locationElem = document.querySelector(".text-body-small.inline.t-black--light.break-words");
    const aboutElem = document.querySelector("#about ~ .pvs-list");
  
    const name = nameElem ? nameElem.innerText.trim() : "";
    const title = titleElem ? titleElem.innerText.trim() : "";
    const location = locationElem ? locationElem.innerText.trim() : "";
  
    const about = aboutElem
      ? Array.from(aboutElem.querySelectorAll("span[aria-hidden='true']"))
          .map((el) => el.innerText.trim())
          .join(" ")
      : "";
  
    const profileText = [name, title, location, about].filter(Boolean).join("\n");
  
    return profileText;
  }
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "get_profile") {
      const profile = getLinkedInProfileData();
      sendResponse({ profile });
    }
  });
  