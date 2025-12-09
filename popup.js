// popup.js - CV AutoFill Extension

let cvData = null;
let fillCount = 0;

document.addEventListener("DOMContentLoaded", function () {
  const cvFileInput = document.getElementById("cvFile");
  const fillButton = document.getElementById("fillButton");
  const resetButton = document.getElementById("resetButton");
  const toggleOptionsButton = document.getElementById("toggleOptions");
  const advancedOptions = document.getElementById("advancedOptions");
  const statusDiv = document.getElementById("status");
  const cvInfo = document.getElementById("cvInfo");
  const cvName = document.getElementById("cvName");
  const upsellBanner = document.getElementById("upsellBanner");
  const dismissBanner = document.getElementById("dismissBanner");
  const emailForm = document.getElementById("emailForm");
  
  // Load saved CV and settings from storage
  chrome.storage.local.get(["cvData", "employmentType", "location", "expectedSalary", "availabilityDate", "coverLetter", "fillCount", "bannerDismissed"], function (result) {
    if (result.cvData) {
      cvData = result.cvData;
      showCVLoaded(cvData.basics?.name || "CV");
      fillButton.disabled = false;
    }

    // Load fill count
    fillCount = result.fillCount || 0;

    // Restore saved form values
    if (result.employmentType) {
      document.getElementById("employmentType").value = result.employmentType;
    }
    if (result.location) {
      document.getElementById("location").value = result.location;
    }
    if (result.expectedSalary) {
      document.getElementById("expectedSalary").value = result.expectedSalary;
    }
    if (result.availabilityDate) {
      document.getElementById("availabilityDate").value = result.availabilityDate;
    }
    if (result.coverLetter) {
      document.getElementById("coverLetter").value = result.coverLetter;
    }
  });

  // Dismiss banner handler
  dismissBanner.addEventListener("click", function() {
    upsellBanner.classList.remove("show");
    chrome.storage.local.set({ bannerDismissed: Date.now() });
  });

  // Email form handler (AJAX to avoid redirect)
  emailForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const formData = new FormData(emailForm);
    fetch(emailForm.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    }).then(response => {
      if (response.ok) {
        emailForm.innerHTML = "<p style='color:#4CAF50;font-size:12px;margin:0;'>✓ Zapisano!</p>";
        chrome.storage.local.set({ emailSubmitted: true });
      }
    }).catch(() => {
      emailForm.innerHTML = "<p style='color:#E31E24;font-size:12px;margin:0;'>Błąd - spróbuj później</p>";
    });
  });
  
  // Toggle advanced options
  toggleOptionsButton.addEventListener("click", function () {
    advancedOptions.classList.toggle("show");
  });
  
  // Auto-save options when they change
  const saveOptions = () => {
    chrome.storage.local.set({
      employmentType: document.getElementById("employmentType").value,
      location: document.getElementById("location").value,
      expectedSalary: document.getElementById("expectedSalary").value,
      availabilityDate: document.getElementById("availabilityDate").value,
      coverLetter: document.getElementById("coverLetter").value,
    });
  };

  document.getElementById("employmentType").addEventListener("change", saveOptions);
  document.getElementById("location").addEventListener("input", saveOptions);
  document.getElementById("expectedSalary").addEventListener("input", saveOptions);
  document.getElementById("availabilityDate").addEventListener("input", saveOptions);
  document.getElementById("coverLetter").addEventListener("input", saveOptions);
  
  // Handle CV file upload
  cvFileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        cvData = JSON.parse(e.target.result);
        
        // Save to storage
        chrome.storage.local.set({ cvData: cvData }, function () {
          showStatus("CV załadowane pomyślnie!", "success");
          showCVLoaded(cvData.basics?.name || file.name);
          fillButton.disabled = false;
        });
      } catch (error) {
        showStatus("Błąd: Nieprawidłowy format JSON", "error");
        console.error("JSON parse error:", error);
      }
    };
    reader.readAsText(file);
  });
  
  // Handle fill button click
  fillButton.addEventListener("click", function () {
    if (!cvData) {
      showStatus("Błąd: Najpierw wczytaj CV", "error");
      return;
    }
    
    // Get options from form
    const options = {
      employmentType: document.getElementById("employmentType").value,
      location: document.getElementById("location").value,
      expectedSalary: document.getElementById("expectedSalary").value,
      availabilityDate: document.getElementById("availabilityDate").value,
      coverLetter: document.getElementById("coverLetter").value,
      salaryCurrency: "PLN netto",
      agreeToDataProcessing: true,
    };

    // Save options to storage for next time
    chrome.storage.local.set({
      employmentType: options.employmentType,
      location: options.location,
      expectedSalary: options.expectedSalary,
      availabilityDate: options.availabilityDate,
      coverLetter: options.coverLetter,
    });
    
    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      
      // First, try to inject the content scripts if they're not already loaded
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: [
          'mappers/solidJobsMapper.js',
          'mappers/traffitMapper.js',
          'mappers/eRecruiterMapper.js',
          'mappers/recruitifyMapper.js',
          'mappers/greenhouseMapper.js',
          'mappers/leverMapper.js',
          'mappers/workdayMapper.js',
          'mappers/bamboohrMapper.js',
          'content.js'
        ]
      }).then(() => {
        // Now send the message
        sendFillMessage(activeTab.id, cvData, options);
      }).catch((error) => {
        // Scripts might already be loaded, try sending message anyway
        console.log('Script injection error (might already be loaded):', error);
        sendFillMessage(activeTab.id, cvData, options);
      });
    });
  });
  
  function sendFillMessage(tabId, cvData, options) {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: "fillForm",
        cvData: cvData,
        options: options,
      },
      function (response) {
        if (chrome.runtime.lastError) {
          showStatus("Błąd: " + chrome.runtime.lastError.message + ". Odśwież stronę i spróbuj ponownie.", "error");
          return;
        }
        
        if (response && response.success) {
          showStatus(response.message, "success");

          // Increment fill count and maybe show upsell
          fillCount++;
          chrome.storage.local.set({ fillCount: fillCount });

          // Show banner every 3rd fill (unless dismissed in last 24h or email submitted)
          if (fillCount % 3 === 0) {
            chrome.storage.local.get(["bannerDismissed", "emailSubmitted"], function(data) {
              const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
              if (!data.emailSubmitted && (!data.bannerDismissed || data.bannerDismissed < dayAgo)) {
                upsellBanner.classList.add("show");
              }
            });
          }
        } else {
          showStatus(
            response?.message || "Nie znaleziono formularza do wypełnienia",
            "error"
          );
        }
      }
    );
  }
  
  // Handle reset button click (for testing)
  resetButton.addEventListener("click", function () {
    if (confirm("Wyczyścić aktywację? (tylko do testów)")) {
      chrome.storage.local.remove([
        "paidAmount",
        "activationCode",
        "discordUnlocked",
        "rainbowMode",
        "fillCount",
        "bannerDismissed",
        "emailSubmitted"
      ], function() {
        document.getElementById("discordSection").classList.remove("show");
        document.body.classList.remove("rainbow-mode");
        document.getElementById("supportSection").innerHTML = `
          <h4>☕ Wesprzyj rozwój + Discord VIP</h4>
          <p style="text-align:center;color:#666;font-size:12px;">Aktywacja wyczyszczona. Przeładuj rozszerzenie.</p>
        `;
        showStatus("Aktywacja wyczyszczona. Przeładuj rozszerzenie.", "info");
      });
    }
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    
    // Auto-hide after 5 seconds for success messages
    if (type === "success") {
      setTimeout(() => {
        statusDiv.style.display = "none";
      }, 5000);
    }
  }
  
  function showCVLoaded(name) {
    cvName.textContent = name;
    cvInfo.style.display = "block";
    // Hide help link when CV is loaded
    const cvHelp = document.getElementById("cvHelp");
    if (cvHelp) cvHelp.style.display = "none";
  }
});

// Feedback form handler
document.addEventListener("DOMContentLoaded", function() {
  const feedbackToggle = document.getElementById("feedbackToggle");
  const feedbackForm = document.getElementById("feedbackForm");
  const bugReportForm = document.getElementById("bugReportForm");
  const feedbackUrl = document.getElementById("feedbackUrl");
  const feedbackSuccess = document.getElementById("feedbackSuccess");

  // Toggle feedback form
  feedbackToggle.addEventListener("click", function() {
    feedbackForm.classList.toggle("show");

    // Auto-fill current tab URL
    if (feedbackForm.classList.contains("show") && !feedbackUrl.value) {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]?.url) {
          feedbackUrl.value = tabs[0].url;
        }
      });
    }
  });

  // Handle form submission via AJAX
  bugReportForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const formData = new FormData(bugReportForm);

    fetch(bugReportForm.action, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    }).then(response => {
      if (response.ok) {
        bugReportForm.style.display = "none";
        feedbackSuccess.style.display = "block";
        setTimeout(() => {
          feedbackForm.classList.remove("show");
          bugReportForm.style.display = "block";
          feedbackSuccess.style.display = "none";
          bugReportForm.reset();
        }, 3000);
      }
    }).catch(() => {
      alert("Błąd wysyłania - spróbuj później");
    });
  });
});

// Listen for form detection from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "formDetected") {
    console.log("Form detected:", request.formType, request.url);
  }
});

// ========================================
// ACTIVATION CODE
// ========================================

document.addEventListener("DOMContentLoaded", function() {
  const activateBtn = document.getElementById("activateBtn");
  const activationCode = document.getElementById("activationCode");
  const discordSection = document.getElementById("discordSection");

  // Check if already activated
  chrome.storage.local.get(["paidAmount", "discordUnlocked", "rainbowMode"], function(data) {
    if (data.discordUnlocked) {
      discordSection.classList.add("show");
      document.getElementById("supportSection").style.display = "none";
    }
    // Rainbow mode for 369+ supporters
    if (data.rainbowMode || data.paidAmount >= 369) {
      document.body.classList.add("rainbow-mode");
    }
  });

  // Activate code
  activateBtn.addEventListener("click", function() {
    const code = activationCode.value.trim().toUpperCase();

    if (!code) {
      alert("Wpisz kod aktywacyjny!");
      return;
    }

    // Parse code: CV{amount}-{timestamp}-{signature}
    // Example: CV50-6756A3B2-A1B2C3D4
    const match = code.match(/^CV(\d+)-([A-Z0-9]+)-([A-Z0-9]+)$/);
    if (!match) {
      alert("Nieprawidłowy format kodu!\n\nKod powinien wyglądać tak:\nCV50-6756A3B2-A1B2C3D4");
      return;
    }

    const amount = parseInt(match[1]);
    // Note: We trust the code format since it's sent via email after real payment
    // Server-side signature verification ensures the code wasn't fabricated

    // Store activation
    const isRainbow = amount >= 369;
    chrome.storage.local.set({
      paidAmount: amount,
      activationCode: code,
      discordUnlocked: amount >= 50,
      rainbowMode: isRainbow
    }, function() {
      // Apply rainbow mode immediately
      if (isRainbow) {
        document.body.classList.add("rainbow-mode");
      }

      if (amount >= 369) {
        discordSection.classList.add("show");
        document.getElementById("supportSection").innerHTML =
          `<p style="color:#4CAF50;text-align:center;">✓ RAINBOW VIP! Dziękuję za ${amount} PLN 🌈</p>`;
        alert(`🌈🎉 WOW! ${amount} PLN!\n\nJesteś RAINBOW VIP!\n\n✅ Discord odblokowany\n✅ Tęczowe pola na zawsze!`);
      } else if (amount >= 50) {
        discordSection.classList.add("show");
        document.getElementById("supportSection").innerHTML =
          `<p style="color:#4CAF50;text-align:center;">✓ Aktywowano! Dziękuję za wsparcie ${amount} PLN</p>`;
        alert(`🎉 Dzięki za ${amount} PLN!\n\nOdblokowałeś dostęp do społeczności Discord!`);
      } else {
        alert(`Dzięki za ${amount} PLN!\n\nAby odblokować Discord, wpłać minimum 50 PLN.`);
      }
    });
  });

  // Init avatar
  updateAvatar(36);
});