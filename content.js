/**
 * Content script - runs on web pages to detect and fill forms
 */

// Prevent re-declaration if script is injected multiple times
if (typeof window.cvAutoFillLoaded !== 'undefined') {
  console.log('CV AutoFill: Script already loaded, skipping');
} else {
  window.cvAutoFillLoaded = true;

// ========================================
// RAINBOW VIP MODE (369+ PLN supporters)
// ========================================

const RAINBOW_CSS = `
@keyframes cv-autofill-rainbow-anim {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
input.cv-autofill-rainbow-field,
textarea.cv-autofill-rainbow-field,
select.cv-autofill-rainbow-field,
.cv-autofill-rainbow-field {
  background: linear-gradient(90deg,
    #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3,
    #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3
  ) !important;
  background-size: 1400% 100% !important;
  animation: cv-autofill-rainbow-anim 3s linear infinite !important;
  color: #000 !important;
  font-weight: bold !important;
  text-shadow: 0 0 2px white !important;
  border: 3px solid #fff !important;
  box-shadow: 0 0 15px rgba(255,255,255,0.8), 0 0 30px rgba(255,0,255,0.5) !important;
}
input.cv-autofill-rainbow-field::placeholder,
textarea.cv-autofill-rainbow-field::placeholder {
  color: rgba(0,0,0,0.7) !important;
}
.cv-confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2147483647;
  overflow: visible;
}
.cv-confetti-piece {
  position: absolute;
  pointer-events: none;
}
`;

// Confetti colors - bright rainbow
const CONFETTI_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8b00ff', '#ff00ff'];
const CONFETTI_SHAPES = ['●', '■', '▲', '★', '♦', '♥', '✦', '✿'];

// Mini confetti for all users (small celebration per field)
function createMiniConfetti(element) {
  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : element;
  const centerX = rect.left + (rect.width || 100) / 2;
  const centerY = rect.top + (rect.height || 30) / 2;

      // Create container if not exists
      let container = document.getElementById('cv-confetti-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'cv-confetti-container';
        container.className = 'cv-confetti-container';
        if (document.body) {
          document.body.appendChild(container);
        }
      }  // Create 6-8 small confetti pieces (subtle effect)
  const count = Math.floor(Math.random() * 3) + 6;
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'cv-confetti-piece';

    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const size = Math.random() * 8 + 8; // smaller: 8-16px

    // Smaller spread, mostly upward
    const angle = (Math.random() * 120 + 210) * (Math.PI / 180); // upward arc
    const velocity = Math.random() * 40 + 30; // shorter distance
    const endX = Math.cos(angle) * velocity;
    const endY = Math.sin(angle) * velocity;
    const rotation = Math.random() * 360;
    const duration = Math.random() * 400 + 400; // faster: 400-800ms

    confetti.textContent = shape;
    confetti.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY}px;
      font-size: ${size}px;
      color: ${color};
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
    `;

    container.appendChild(confetti);
    confetti.offsetHeight; // force reflow

    const animation = confetti.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${rotation}deg) scale(0.2)`, opacity: 0 }
    ], {
      duration: duration,
      easing: 'ease-out',
      fill: 'forwards'
    });

    animation.onfinish = () => confetti.remove();
  }
}

// Apply mini confetti to filled fields (for everyone)
function celebrateFilledFields() {
  const fields = document.querySelectorAll('input, textarea, select');
  const filledFields = Array.from(fields).filter(field =>
    field.value && field.value.trim() !== '' &&
    field.type !== 'hidden' &&
    field.type !== 'submit' &&
    field.type !== 'button' &&
    field.offsetParent !== null
  );

  // Stagger mini confetti across fields
  filledFields.forEach((field, index) => {
    setTimeout(() => createMiniConfetti(field), index * 80);
  });
}

function createConfettiAtElement(element) {
  console.log('🎊 Creating confetti at element', element, 'rainbowMode:', rainbowModeEnabled);

  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : element;
  const centerX = rect.left + (rect.width || 100) / 2;
  const centerY = rect.top + (rect.height || 50) / 2;

  console.log('🎊 Confetti position:', centerX, centerY);

  // Create container if not exists
  let container = document.getElementById('cv-confetti-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cv-confetti-container';
    container.className = 'cv-confetti-container';
    if (document.body) {
      document.body.appendChild(container);
    }
    console.log('🎊 Created confetti container');
  }

  // Create 40 confetti pieces
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'cv-confetti-piece';

    // Random properties
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const size = Math.random() * 16 + 12;

    // Explosion physics - spread in all directions
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const velocity = Math.random() * 150 + 80;
    const endX = Math.cos(angle) * velocity;
    const endY = Math.sin(angle) * velocity - 50; // slight upward bias
    const rotation = Math.random() * 1080 - 540;
    const duration = Math.random() * 1000 + 800;

    confetti.textContent = shape;
    confetti.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY}px;
      font-size: ${size}px;
      color: ${color};
      text-shadow: 0 0 3px ${color}, 0 0 6px white;
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
      transition: none;
    `;

    container.appendChild(confetti);

    // Force reflow
    confetti.offsetHeight;

    // Animate using Web Animations API
    const animation = confetti.animate([
      {
        transform: 'translate(-50%, -50%) rotate(0deg) scale(1)',
        opacity: 1
      },
      {
        transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) rotate(${rotation}deg) scale(0.3)`,
        opacity: 0
      }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      fill: 'forwards'
    });

    // Remove after animation
    animation.onfinish = () => confetti.remove();
  }

  console.log('🎊 Created 40 confetti pieces');
}

let rainbowModeEnabled = false;

// Check rainbow mode on load
chrome.storage.local.get(['rainbowMode'], function(data) {
  rainbowModeEnabled = data.rainbowMode || false;
  if (rainbowModeEnabled) {
    injectRainbowCSS();
  }
});

function injectRainbowCSS() {
  if (document.getElementById('cv-autofill-rainbow-styles')) return;
  const style = document.createElement('style');
  style.id = 'cv-autofill-rainbow-styles';
  style.textContent = RAINBOW_CSS;
  if (document.head) {
    document.head.appendChild(style);
  }
}

function applyRainbowToField(field) {
  if (!rainbowModeEnabled) return;
  injectRainbowCSS();
  field.classList.add('cv-autofill-rainbow-field');
}

function applyRainbowToFilledFields() {
  console.log('🌈 applyRainbowToFilledFields called, checking storage...');

  // Check storage directly to ensure we have latest value
  chrome.storage.local.get(['rainbowMode', 'paidAmount'], function(data) {
    const isRainbow = data.rainbowMode || (data.paidAmount && data.paidAmount >= 369);
    console.log('🌈 Rainbow mode from storage:', isRainbow, data);

    if (!isRainbow) {
      console.log('🌈 Rainbow mode not enabled, skipping effects');
      return;
    }

    // Update global flag
    rainbowModeEnabled = true;
    injectRainbowCSS();

    // Find all filled inputs/textareas/selects
    const fields = document.querySelectorAll('input, textarea, select');
    const filledFields = Array.from(fields).filter(field =>
      field.value && field.value.trim() !== '' &&
      field.type !== 'hidden' &&
      field.type !== 'submit' &&
      field.type !== 'button' &&
      field.offsetParent !== null // visible
    );

    console.log('🌈 Found', filledFields.length, 'filled fields');

    // Apply rainbow and confetti with staggered delay for epic effect
    filledFields.forEach((field, index) => {
      setTimeout(() => {
        console.log('🌈 Applying rainbow to field', index, field);
        field.classList.add('cv-autofill-rainbow-field');
        createConfettiAtElement(field);

        // Scroll field into view briefly
        try {
          field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch(e) {}
      }, index * 200); // 200ms between each explosion
    });

    // Big finale confetti burst after all fields
    setTimeout(() => {
      if (filledFields.length > 0) {
        console.log('🎊 FINALE! Triple confetti burst!');
        // Extra confetti burst in the middle of the screen
        const centerRect = {
          left: window.innerWidth / 2 - 50,
          top: window.innerHeight / 2,
          width: 100,
          height: 50
        };
        createConfettiAtElement(centerRect);
        setTimeout(() => createConfettiAtElement(centerRect), 100);
        setTimeout(() => createConfettiAtElement(centerRect), 200);
      }
    }, filledFields.length * 200 + 300);
  });
}

// ========================================
// FORM DETECTION AND FILLING
// ========================================

// Compatibility alias: original mapper exposes isRecruitifyForm, we used detectRecruitifyForm
try {
  if (typeof detectRecruitifyForm === 'undefined' && typeof isRecruitifyForm === 'function') {
    // eslint-disable-next-line no-var
    var detectRecruitifyForm = function() { return isRecruitifyForm(); };
  }
} catch (_) {}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    // Check if already completed to prevent loops
    const pageKey = 'cvAutoFill_' + window.location.href;
    const lastFillTime = localStorage.getItem(pageKey + '_time');
    const now = Date.now();
    const recentlyFilled = lastFillTime && (now - parseInt(lastFillTime)) < 30000;

    if (window.cvAutoFillCompleted === pageKey || sessionStorage.getItem(pageKey) || recentlyFilled) {
      console.log('CV AutoFill: Form already filled, skipping manual trigger');
      sendResponse({
        success: false,
        message: 'Formularz został już wypełniony na tej stronie.',
        formType: 'already_filled'
      });
      return true;
    }

    // Check if auto-fill is enabled for manual triggers too
    chrome.storage.local.get(['autoFillEnabled'], function(data) {
      const autoFillEnabled = data.autoFillEnabled !== false;
      if (!autoFillEnabled) {
        console.log('CV AutoFill: Auto-fill is disabled by user');
        sendResponse({
          success: false,
          message: 'Automatyczne wypełnianie jest wyłączone. Włącz je w opcjach rozszerzenia.',
          formType: 'disabled'
        });
        return true;
      }

      // Continue with form filling
      try {
        const cvData = request.cvData;
        const options = request.options || {};
        
        // Try to detect and fill SOLID.jobs form
        const solidJobsDetected = detectSolidJobsForm();
      
      // Try to detect Traffit form
      const traffitDetected = detectTraffitForm();
      
      // Try to detect eRecruiter form
      const eRecruiterDetected = detectERecruiterForm();
      
      // Try to detect Recruitify form
      const recruitifyDetected = detectRecruitifyForm();
      
      // Try to detect Greenhouse form
      const greenhouseDetected = detectGreenhouseForm();
      // Try to detect Lever form
      const leverDetected = detectLeverForm();
      // Try to detect Workday form
      const workdayDetected = detectWorkdayForm();
      // Try to detect Element App form
      const elementAppDetected = detectElementAppForm();
      const bamboohrDetected = detectBambooHRForm();

      if (solidJobsDetected) {
      // Handle async fill function
      fillSolidJobsForm(cvData, options).then(success => {
        if (success) {
          celebrateFilledFields(); // 🎉 Mini confetti for all
          applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        }
        sendResponse({
          success: success,
          message: success ? 'Formularz wypełniony pomyślnie!' : 'Nie udało się wypełnić formularza.',
          formType: 'SOLID.jobs'
        });
      }).catch(error => {
        console.error('Error filling form:', error);
        sendResponse({
          success: false,
          message: 'Błąd podczas wypełniania: ' + error.message,
          formType: 'SOLID.jobs'
        });
      });
      } else if (traffitDetected) {
      // Handle Traffit form
      fillTraffitForm(cvData, options).then(success => {
        if (success) {
          celebrateFilledFields(); // 🎉 Mini confetti for all
          applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        }
        sendResponse({
          success: success,
          message: success ? 'Formularz Traffit wypełniony pomyślnie!' : 'Nie udało się wypełnić formularza.',
          formType: 'Traffit'
        });
      }).catch(error => {
        console.error('Error filling Traffit form:', error);
        sendResponse({
          success: false,
          message: 'Błąd podczas wypełniania: ' + error.message,
          formType: 'Traffit'
        });
      });
      } else if (eRecruiterDetected) {
      // Handle eRecruiter form
      fillERecruiterForm(cvData, options).then(success => {
        if (success) {
          celebrateFilledFields(); // 🎉 Mini confetti for all
          applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        }
        sendResponse({
          success: success,
          message: success ? 'Formularz eRecruiter wypełniony pomyślnie!' : 'Nie udało się wypełnić formularza.',
          formType: 'eRecruiter'
        });
      }).catch(error => {
        console.error('Error filling eRecruiter form:', error);
        sendResponse({
          success: false,
          message: 'Błąd podczas wypełniania: ' + error.message,
          formType: 'eRecruiter'
        });
      });
      } else if (recruitifyDetected) {
      // Handle Recruitify form
      fillRecruitifyForm(cvData, options);
      celebrateFilledFields(); // 🎉 Mini confetti for all
      applyRainbowToFilledFields(); // 🌈 Rainbow VIP
      sendResponse({
        success: true,
        message: 'Formularz Recruitify wypełniony!',
        formType: 'Recruitify'
      });
      } else if (greenhouseDetected) {
      // Handle Greenhouse form
      fillGreenhouseForm(cvData, options);
      celebrateFilledFields(); // 🎉 Mini confetti for all
      applyRainbowToFilledFields(); // 🌈 Rainbow VIP
      sendResponse({
        success: true,
        message: 'Formularz Greenhouse wypełniony!',
        formType: 'Greenhouse'
      });
      } else if (leverDetected) {
      // Handle Lever form (async)
      fillLeverForm(cvData, options).then(success => {
        if (success) {
          celebrateFilledFields(); // 🎉 Mini confetti for all
          applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        }
        sendResponse({
          success: success,
          message: success ? 'Formularz Lever wypełniony!' : 'Nie udało się wypełnić formularza.',
          formType: 'Lever'
        });
      }).catch(error => {
        console.error('Error filling Lever form:', error);
        sendResponse({
          success: false,
          message: 'Błąd podczas wypełniania: ' + error.message,
          formType: 'Lever'
        });
      });
      } else if (workdayDetected) {
        // Handle Workday form
        fillWorkdayForm(cvData, options);
        celebrateFilledFields(); // 🎉 Mini confetti for all
        applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        sendResponse({
          success: true,
          message: 'Workday form filled!',
          formType: 'Workday'
        });
      } else if (elementAppDetected) {
        // Handle Element App form
        const success = fillElementAppForm(cvData, options);
        if (success) {
          celebrateFilledFields(); // 🎉 Mini confetti for all
          applyRainbowToFilledFields(); // 🌈 Rainbow VIP
        }
        sendResponse({
          success: success,
          message: success ? 'Element App form filled!' : 'Could not fill Element App form.',
          formType: 'ElementApp'
        });
      } else if (bamboohrDetected) {
        // Handle BambooHR form
        fillBambooHRForm(cvData, options).then(success => {
          if (success) {
            celebrateFilledFields(); // 🎉 Mini confetti for all
            applyRainbowToFilledFields(); // 🌈 Rainbow VIP
          }
          sendResponse({
            success: success,
            message: success ? 'Formularz BambooHR wypełniony!' : 'Nie udało się wypełnić formularza.',
            formType: 'BambooHR'
          });
        }).catch(error => {
          console.error('Error filling BambooHR form:', error);
          sendResponse({
            success: false,
            message: 'Błąd podczas wypełniania: ' + error.message,
            formType: 'BambooHR'
          });
        });
      } else {
      sendResponse({
        success: false,
        message: 'Nie znaleziono wspieranego formularza na tej stronie.',
        formType: 'unknown'
      });
      }
      
      return true; // Keep the message channel open for async response
    } catch (err) {
      console.error('Content script error:', err);
      try {
        sendResponse({ success: false, message: 'Błąd: ' + (err?.message || String(err)), formType: 'unknown' });
      } catch (_) {}
      return true;
    }
    }); // Close chrome.storage.local.get callback
  }
  
  if (request.action === 'detectForm') {
    try {
      // Detect what kind of form is on the page
      const solidJobsDetected = detectSolidJobsForm();
      const traffitDetected = detectTraffitForm();
      const eRecruiterDetected = detectERecruiterForm();
      const recruitifyDetected = detectRecruitifyForm();
      const greenhouseDetected = detectGreenhouseForm();
      const leverDetected = detectLeverForm();
      const workdayDetected = detectWorkdayForm();
      // Try to detect Element App form
      const elementAppDetected = detectElementAppForm();
      const bamboohrDetected = detectBambooHRForm();

      if (solidJobsDetected) {
        sendResponse({ detected: true, formType: 'SOLID.jobs', url: window.location.href });
      } else if (traffitDetected) {
        sendResponse({ detected: true, formType: 'Traffit', url: window.location.href });
      } else if (eRecruiterDetected) {
        sendResponse({ detected: true, formType: 'eRecruiter', url: window.location.href });
      } else if (recruitifyDetected) {
        sendResponse({ detected: true, formType: 'Recruitify', url: window.location.href });
      } else if (greenhouseDetected) {
        sendResponse({ detected: true, formType: 'Greenhouse', url: window.location.href });
      } else if (leverDetected) {
        sendResponse({ detected: true, formType: 'Lever', url: window.location.href });
      } else if (workdayDetected) {
        sendResponse({ detected: true, formType: 'Workday', url: window.location.href });
      } else if (bamboohrDetected) {
        sendResponse({ detected: true, formType: 'BambooHR', url: window.location.href });
      } else {
        sendResponse({ detected: false, formType: 'unknown', url: window.location.href });
      }
      
      return true;
    } catch (err) {
      console.error('Detection error:', err);
      try { sendResponse({ detected: false, formType: 'unknown', error: String(err) }); } catch (_) {}
      return true;
    }
  }
});

// Notify popup when page loads with a supported form
window.addEventListener('load', () => {
  const solidJobsDetected = detectSolidJobsForm();
  const traffitDetected = detectTraffitForm();
  const eRecruiterDetected = detectERecruiterForm();
  const recruitifyDetected = detectRecruitifyForm();
  const greenhouseDetected = detectGreenhouseForm();
  const leverDetected = detectLeverForm();
  const workdayDetected = detectWorkdayForm();
      // Try to detect Element App form
      const elementAppDetected = detectElementAppForm();
  const bamboohrDetected = detectBambooHRForm();

  let formType = null;
  if (solidJobsDetected) formType = 'SOLID.jobs';
  else if (traffitDetected) formType = 'Traffit';
  else if (eRecruiterDetected) formType = 'eRecruiter';
  else if (recruitifyDetected) formType = 'Recruitify';
  else if (greenhouseDetected) formType = 'Greenhouse';
  else if (leverDetected) formType = 'Lever';
  else if (workdayDetected) formType = 'Workday';
  else if (elementAppDetected) formType = 'ElementApp';
  else if (bamboohrDetected) formType = 'BambooHR';

  if (formType) {
    chrome.runtime.sendMessage({
      action: 'formDetected',
      formType: formType,
      url: window.location.href
    });
  }
});

// AUTO-FILL when form is detected and CV data is available
let autoFillAlreadyRan = false;

async function autoFillIfReady() {
  // Check if this is a page reload - if so, don't auto-fill
  const navigation = performance.getEntriesByType('navigation')[0];
  if (navigation && navigation.type === 'reload') {
    console.log('CV AutoFill: Page was reloaded, skipping auto-fill to prevent loops');
    return;
  }

  // Check if we recently filled this page (within last 30 seconds)
  const pageKey = 'cvAutoFill_' + window.location.href;
  const lastFillTime = localStorage.getItem(pageKey + '_time');
  const now = Date.now();
  if (lastFillTime && (now - parseInt(lastFillTime)) < 30000) {
    console.log('CV AutoFill: Recently filled this page, skipping to prevent loops');
    return;
  }

  // Prevent running multiple times on the same page - more robust check
  if (window.cvAutoFillCompleted === pageKey) {
    console.log('CV AutoFill: Already completed on this page, skipping');
    return;
  }
  if (autoFillAlreadyRan) {
    console.log('CV AutoFill: Already ran on this page, skipping');
    return;
  }

  // Also check sessionStorage to survive minor page updates
  if (sessionStorage.getItem(pageKey)) {
    console.log('CV AutoFill: Already filled this page (session), skipping');
    return;
  }

  // Check if CV data is available in storage
  chrome.storage.local.get(['cvData', 'employmentType', 'location', 'expectedSalary', 'availabilityDate', 'coverLetter', 'autoFillEnabled'], async function(data) {
    // Check if auto-fill is enabled (default to true)
    const autoFillEnabled = data.autoFillEnabled !== false;
    if (!autoFillEnabled) {
      console.log('CV AutoFill: Auto-fill is disabled by user');
      return;
    }

    if (!data.cvData) {
      console.log('CV AutoFill: No CV data found, skipping auto-fill');
      showNotification('CV AutoFill: Wgraj CV w rozszerzeniu aby włączyć auto-wypełnianie', 'warning');
      return;
    }

    const cvData = data.cvData;
    const options = {
      employmentType: data.employmentType || 'B2B',
      location: data.location || 'Warszawa',
      expectedSalary: data.expectedSalary || '',
      availabilityDate: data.availabilityDate || 'Natychmiast',
      coverLetter: data.coverLetter || ''
    };

    // Detect which form type
    const solidJobsDetected = detectSolidJobsForm();
    const traffitDetected = detectTraffitForm();
    const eRecruiterDetected = detectERecruiterForm();
    const recruitifyDetected = detectRecruitifyForm();
    const greenhouseDetected = detectGreenhouseForm();
    const leverDetected = detectLeverForm();
    const workdayDetected = detectWorkdayForm();
      // Try to detect Element App form
      const elementAppDetected = detectElementAppForm();
    const bamboohrDetected = detectBambooHRForm();

    let formType = null;
    let fillResult = false;

    try {
      if (solidJobsDetected) {
        formType = 'SOLID.jobs';
        fillResult = await fillSolidJobsForm(cvData, options);
      } else if (traffitDetected) {
        formType = 'Traffit';
        fillResult = await fillTraffitForm(cvData, options);
      } else if (eRecruiterDetected) {
        formType = 'eRecruiter';
        fillResult = await fillERecruiterForm(cvData, options);
      } else if (recruitifyDetected) {
        formType = 'Recruitify';
        fillRecruitifyForm(cvData, options);
        fillResult = true;
      } else if (greenhouseDetected) {
        formType = 'Greenhouse';
        fillGreenhouseForm(cvData, options);
        fillResult = true;
      } else if (leverDetected) {
        formType = 'Lever';
        fillResult = await fillLeverForm(cvData, options);
      } else if (workdayDetected) {
        formType = 'Workday';
        fillWorkdayForm(cvData, options);
        fillResult = true;
      } else if (bamboohrDetected) {
        formType = 'BambooHR';
        fillResult = await fillBambooHRForm(cvData, options);
      }

      if (formType && fillResult) {
        console.log(`CV AutoFill: ${formType} form filled automatically!`);
        // Mark as filled to prevent loops - multiple safeguards
        autoFillAlreadyRan = true;
        window.cvAutoFillCompleted = pageKey;
        sessionStorage.setItem(pageKey, 'filled');
        localStorage.setItem(pageKey + '_time', Date.now().toString());

        showNotification(`CV AutoFill: Formularz ${formType} wypełniony!`, 'success');
        // Mini confetti for everyone! 🎉
        celebrateFilledFields();
        // Rainbow VIP gets extra effects
        applyRainbowToFilledFields();
      } else if (!formType) {
        console.log('CV AutoFill: No supported form detected');
        // Don't mark as filled if no form found - user might navigate to form later
      }
    } catch (error) {
      console.error('CV AutoFill: Error during auto-fill:', error);
      showNotification('CV AutoFill: Błąd wypełniania - spróbuj ręcznie', 'error');
    }
  });
}

function showNotification(message, type) {
  // Remove existing notification
  const existing = document.getElementById('cv-autofill-notification');
  if (existing) existing.remove();

  const colors = {
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#f44336'
  };

  const notification = document.createElement('div');
  notification.id = 'cv-autofill-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${colors[type] || colors.success};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
    ">
      ${message}
    </div>
  `;
  if (document.body) {
    document.body.appendChild(notification);
  }

  // Auto-hide after 4 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transition = 'opacity 0.5s';
      notification.style.opacity = '0';
      setTimeout(() => {
        try {
          notification.remove();
        } catch (e) {
          console.error('Error removing notification:', e);
        }
      }, 500);
    }
  }, 4000);
}

// Auto-fill when page loads (with small delay to ensure form is ready)
if (document && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Double-check before scheduling
    const pageKey = 'cvAutoFill_' + window.location.href;
    const lastFillTime = localStorage.getItem(pageKey + '_time');
    const now = Date.now();
    const recentlyFilled = lastFillTime && (now - parseInt(lastFillTime)) < 30000;

    // Check if auto-fill is enabled
    chrome.storage.local.get(['autoFillEnabled'], function(data) {
      const autoFillEnabled = data.autoFillEnabled !== false;
      if (autoFillEnabled && !window.cvAutoFillCompleted && !sessionStorage.getItem(pageKey) && !recentlyFilled) {
        setTimeout(autoFillIfReady, 500);
      }
    });
  });
} else if (document) {
  // Double-check before scheduling
  const pageKey = 'cvAutoFill_' + window.location.href;
  const lastFillTime = localStorage.getItem(pageKey + '_time');
  const now = Date.now();
  const recentlyFilled = lastFillTime && (now - parseInt(lastFillTime)) < 30000;

  // Check if auto-fill is enabled
  chrome.storage.local.get(['autoFillEnabled'], function(data) {
    const autoFillEnabled = data.autoFillEnabled !== false;
    if (autoFillEnabled && !window.cvAutoFillCompleted && !sessionStorage.getItem(pageKey) && !recentlyFilled) {
      setTimeout(autoFillIfReady, 500);
    }
  });
}

} // End of cvAutoFillLoaded check
