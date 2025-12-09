/**
 * Mapper for BambooHR application forms (*.bamboohr.com)
 * Browser extension compatible version
 */

/**
 * Maps CV data to BambooHR form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToBambooHRForm(cvData, options = {}) {
  const basics = cvData.basics || {};

  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get LinkedIn URL
  const linkedInProfile = basics.profiles?.find(p =>
    p.network?.toLowerCase() === 'linkedin'
  );

  // Get website/portfolio URL
  const websiteUrl = basics.url || basics.profiles?.find(p =>
    p.network?.toLowerCase() === 'website' || p.network?.toLowerCase() === 'portfolio'
  )?.url || '';

  const formData = {
    firstName: firstName,
    lastName: lastName,
    fullName: basics.name || '',
    email: basics.email || '',
    phone: basics.phone || '',
    address: basics.location?.address || '',
    city: basics.location?.city || '',
    state: basics.location?.region || '',
    country: basics.location?.countryCode || basics.location?.country || '',
    zipCode: basics.location?.postalCode || '',
    linkedInUrl: linkedInProfile?.url || '',
    websiteUrl: websiteUrl,
    coverLetter: options.coverLetter || basics.summary || '',
    expectedSalary: options.expectedSalary || '',
    availability: options.availabilityDate || '',
  };

  return formData;
}

/**
 * Detects if current page is a BambooHR form
 * @returns {boolean} True if on BambooHR form page
 */
function detectBambooHRForm() {
  return window.location.hostname.includes('bamboohr.com') &&
         (window.location.pathname.includes('/careers/') ||
          window.location.pathname.includes('/jobs/'));
}

/**
 * Fills the BambooHR application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
async function fillBambooHRForm(cvData, options = {}) {
  const formData = mapCVToBambooHRForm(cvData, options);

  console.log('Filling BambooHR form with data:', formData);

  // Helper to add delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to set React/Angular input value
  const setInputValue = async (element, value) => {
    if (!element || !value) return false;

    // For React-based forms
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, value);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    await delay(50);

    return true;
  };

  // Helper to find input by various methods
  const findInput = (selectors, labelTexts = []) => {
    // Try selectors first
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el;
    }

    // Try finding by label
    for (const text of labelTexts) {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find(l => l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const el = document.querySelector(`#${forAttr}`);
          if (el) return el;
        }
        const parent = label.closest('.fab-FormField, .field, .form-group, div');
        const input = parent?.querySelector('input, textarea, select');
        if (input) return input;
      }
    }

    // Try finding by placeholder
    for (const text of labelTexts) {
      const el = document.querySelector(`input[placeholder*="${text}" i], textarea[placeholder*="${text}" i]`);
      if (el) return el;
    }

    return null;
  };

  let filled = 0;

  // Wait for form to be ready (BambooHR loads dynamically)
  await delay(500);

  // Field mappings for BambooHR
  const fieldMappings = [
    // Name fields
    {
      selectors: ['input[name="firstName"]', 'input[id*="firstName"]', 'input[data-field="firstName"]'],
      labels: ['first name', 'imię'],
      value: formData.firstName
    },
    {
      selectors: ['input[name="lastName"]', 'input[id*="lastName"]', 'input[data-field="lastName"]'],
      labels: ['last name', 'nazwisko'],
      value: formData.lastName
    },
    {
      selectors: ['input[name="name"]', 'input[name="fullName"]'],
      labels: ['full name', 'name', 'imię i nazwisko'],
      value: formData.fullName
    },

    // Contact fields
    {
      selectors: ['input[name="email"]', 'input[type="email"]', 'input[id*="email"]'],
      labels: ['email', 'e-mail'],
      value: formData.email
    },
    {
      selectors: ['input[name="phone"]', 'input[type="tel"]', 'input[id*="phone"]'],
      labels: ['phone', 'telefon', 'mobile'],
      value: formData.phone
    },

    // Address fields
    {
      selectors: ['input[name="address"]', 'input[id*="address"]', 'input[name="streetAddress"]'],
      labels: ['address', 'street', 'adres'],
      value: formData.address
    },
    {
      selectors: ['input[name="city"]', 'input[id*="city"]'],
      labels: ['city', 'miasto'],
      value: formData.city
    },
    {
      selectors: ['input[name="state"]', 'input[id*="state"]', 'select[name="state"]'],
      labels: ['state', 'province', 'region', 'województwo'],
      value: formData.state
    },
    {
      selectors: ['input[name="zip"]', 'input[name="zipCode"]', 'input[name="postalCode"]', 'input[id*="zip"]'],
      labels: ['zip', 'postal', 'kod pocztowy'],
      value: formData.zipCode
    },

    // Professional links
    {
      selectors: ['input[name="linkedinUrl"]', 'input[name="linkedin"]', 'input[id*="linkedin"]'],
      labels: ['linkedin'],
      value: formData.linkedInUrl
    },
    {
      selectors: ['input[name="websiteUrl"]', 'input[name="website"]', 'input[name="portfolio"]', 'input[id*="website"]'],
      labels: ['website', 'portfolio', 'url'],
      value: formData.websiteUrl
    },

    // Cover letter / Additional info
    {
      selectors: ['textarea[name="coverLetter"]', 'textarea[name="message"]', 'textarea[id*="cover"]', 'textarea[id*="letter"]'],
      labels: ['cover letter', 'message', 'list motywacyjny', 'additional'],
      value: formData.coverLetter
    },
  ];

  // Fill all fields
  for (const mapping of fieldMappings) {
    if (mapping.value) {
      const element = findInput(mapping.selectors, mapping.labels);
      if (element) {
        await setInputValue(element, mapping.value);
        filled++;
        console.log(`Filled: ${mapping.labels[0]}`, mapping.value);
      }
    }
  }

  // Handle checkboxes (consent, GDPR)
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    const label = checkbox.closest('label')?.textContent?.toLowerCase() ||
                  document.querySelector(`label[for="${checkbox.id}"]`)?.textContent?.toLowerCase() || '';

    const isConsent = label.includes('consent') || label.includes('agree') || label.includes('privacy') ||
                      label.includes('zgod') || label.includes('terms') || label.includes('policy') ||
                      label.includes('accept') || label.includes('akceptuj');

    if (isConsent && !checkbox.checked) {
      checkbox.click();
      await delay(50);
      filled++;
      console.log('Checked consent checkbox');
    }
  }

  console.log(`BambooHR form: Filled ${filled} fields`);

  return filled > 0;
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapCVToBambooHRForm,
    fillBambooHRForm,
    detectBambooHRForm
  };
}
