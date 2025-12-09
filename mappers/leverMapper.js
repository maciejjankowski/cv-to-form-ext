/**
 * Mapper for Lever application forms (jobs.lever.co)
 * Browser extension compatible version
 */

/**
 * Maps CV data to Lever form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToLeverForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  const work = cvData.work || [];

  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Profiles
  const linkedInProfile = basics.profiles?.find(p => p.network?.toLowerCase() === 'linkedin');
  const githubProfile = basics.profiles?.find(p => p.network?.toLowerCase() === 'github');

  const formData = {
    fullName: basics.name || `${firstName} ${lastName}`.trim(),
    email: basics.email || '',
    phone: basics.phone || '',
    location: basics.location?.city || '',
    linkedInUrl: linkedInProfile?.url || '',
    githubUrl: githubProfile?.url || '',
    portfolioUrl: basics.url || '',
    comments: options.coverLetter || basics.summary || ''
  };

  return formData;
}

/**
 * Fills the Lever application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
async function fillLeverForm(cvData, options = {}) {
  const formData = mapCVToLeverForm(cvData, options);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to set input value and trigger events (works with React)
  const setInput = async (el, value) => {
    if (!el || !value) return false;

    // Focus first
    el.focus();
    await delay(30);

    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (el.tagName === 'TEXTAREA' && textareaSetter) {
      textareaSetter.call(el, value);
    } else if (inputSetter) {
      inputSetter.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(30);
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  };

  // Helper to find input by label text
  const findByLabel = (labelTexts) => {
    for (const text of labelTexts) {
      // Check labels
      const labels = Array.from(document.querySelectorAll('label'));
      for (const label of labels) {
        if (label.textContent.toLowerCase().includes(text.toLowerCase())) {
          const forAttr = label.getAttribute('for');
          if (forAttr) {
            const el = document.getElementById(forAttr);
            if (el) return el;
          }
          const parent = label.closest('.application-question, .field, .form-group, div');
          const input = parent?.querySelector('input, textarea, select');
          if (input) return input;
        }
      }
      // Check placeholders
      const byPlaceholder = document.querySelector(`input[placeholder*="${text}" i], textarea[placeholder*="${text}" i]`);
      if (byPlaceholder) return byPlaceholder;
    }
    return null;
  };

  // Wait for form to load
  await delay(1000);

  let filled = 0;
  const filledElements = new Set();

  const trySet = async (selectors, labelTexts, value) => {
    if (!value) return false;

    // Try selectors first
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el && !filledElements.has(el)) {
          await setInput(el, value);
          filledElements.add(el);
          filled++;
          console.log(`Filled by selector: ${sel}`, value);
          return true;
        }
      } catch (e) {}
    }

    // Try label matching
    const el = findByLabel(labelTexts);
    if (el && !filledElements.has(el)) {
      await setInput(el, value);
      filledElements.add(el);
      filled++;
      console.log(`Filled by label: ${labelTexts[0]}`, value);
      return true;
    }

    return false;
  };

  // Standard Lever form fields
  await trySet(
    ['input[name="name"]', 'input#name', 'input[data-qa="name-input"]'],
    ['full name', 'name', 'imię i nazwisko'],
    formData.fullName
  );

  await trySet(
    ['input[name="email"]', 'input#email', 'input[type="email"]', 'input[data-qa="email-input"]'],
    ['email', 'e-mail'],
    formData.email
  );

  await trySet(
    ['input[name="phone"]', 'input#phone', 'input[type="tel"]', 'input[data-qa="phone-input"]'],
    ['phone', 'telefon', 'mobile'],
    formData.phone
  );

  await trySet(
    ['input[name="org"]', 'input[name="currentCompany"]'],
    ['current company', 'company', 'organization', 'firma'],
    cvData.work?.[0]?.name || ''
  );

  // URLs - Lever uses specific naming
  await trySet(
    ['input[name="urls[LinkedIn]"]', 'input[data-source="LinkedIn"]'],
    ['linkedin'],
    formData.linkedInUrl
  );

  await trySet(
    ['input[name="urls[GitHub]"]', 'input[data-source="GitHub"]'],
    ['github'],
    formData.githubUrl
  );

  await trySet(
    ['input[name="urls[Portfolio]"]', 'input[name="urls[Website]"]', 'input[name="urls[Other]"]'],
    ['portfolio', 'website', 'url'],
    formData.portfolioUrl
  );

  // Comments / Cover letter
  await trySet(
    ['textarea[name="comments"]', 'textarea#comments', 'textarea[data-qa="additional-info"]'],
    ['additional', 'cover letter', 'comments', 'message'],
    formData.comments
  );

  // Consent checkboxes
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    const labelEl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
    const label = labelEl?.textContent?.toLowerCase() || cb.parentElement?.textContent?.toLowerCase() || '';
    const isConsent = label.includes('consent') || label.includes('privacy') || label.includes('gdpr') ||
                      label.includes('agree') || label.includes('terms') || label.includes('acknowledge');
    if (isConsent && !cb.checked) {
      cb.click();
      cb.dispatchEvent(new Event('change', { bubbles: true }));
      filled++;
    }
  });

  console.log(`Lever form: Filled ${filled} fields`);
  return filled > 0;
}

/**
 * Detects if current page is a Lever form
 * @returns {boolean}
 */
function detectLeverForm() {
  return (
    window.location.hostname.includes('jobs.lever.co') && window.location.pathname.includes('/apply')
  ) || document.querySelector('form[action*="/apply"] input[name="email"]') !== null;
}

// Expose for extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapCVToLeverForm, fillLeverForm, detectLeverForm };
}
