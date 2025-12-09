/**
 * Mapper for Recruitify application forms (*.recruitify.ai)
 * Browser extension compatible version
 */

/**
 * Maps CV data to Recruitify form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToRecruitifyForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  const work = cvData.work || [];
  
  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Get LinkedIn URL
  const linkedInProfile = basics.profiles?.find(p => 
    p.network?.toLowerCase() === 'linkedin'
  );
  
  // Calculate years of experience
  const calculateExperienceYears = () => {
    if (work.length === 0) return 0;
    const sortedWork = [...work].sort((a, b) => {
      const dateA = new Date(a.startDate || '2000-01-01');
      const dateB = new Date(b.startDate || '2000-01-01');
      return dateA - dateB;
    });
    const firstJob = new Date(sortedWork[0].startDate || '2000-01-01');
    const now = new Date();
    const years = Math.floor((now - firstJob) / (1000 * 60 * 60 * 24 * 365.25));
    return years;
  };
  
  const formData = {
    // Basic information
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    
    // Location
    country: basics.location?.country || 'Poland',
    city: basics.location?.city || '',
    
    // Professional links
    linkedInUrl: linkedInProfile?.url || '',
    websiteUrl: basics.url || '',
    
    // Experience
    experienceYears: calculateExperienceYears(),
    
    // Additional info
    summary: basics.summary || '',
    
    // Options from user
    expectedSalary: options.expectedSalary || '',
    availability: options.availabilityDate || 'Immediately',
    workMode: options.workMode || 'Remote',
    consent: true
  };
  
  return formData;
}

/**
 * Fills the Recruitify application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
function fillRecruitifyForm(cvData, options = {}) {
  const formData = mapCVToRecruitifyForm(cvData, options);
  
  console.log('Filling Recruitify form with data:', formData);
  
  // Helper function to set input value and trigger events
  const setInputValue = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    }
    return false;
  };
  
  // Helper function to set React-based input
  const setReactInput = (element, value) => {
    if (!element || !value) return false;
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    nativeInputValueSetter.call(element, value);
    
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  };
  
  // Helper to find input by label text
  const findInputByLabel = (labelTexts) => {
    for (const text of labelTexts) {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find(l => l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const el = document.querySelector(`#${forAttr}`);
          if (el) return el;
        }
        const parent = label.closest('.form-group, .field, div') || label.parentElement;
        const input = parent?.querySelector('input, textarea, select');
        if (input) return input;
      }
    }
    return null;
  };

  // Wait for form to be ready
  setTimeout(() => {
    let filled = 0;

    // Try common Recruitify field patterns (English + Polish)
    const fieldMappings = [
      // Name fields (Polish: Imię i nazwisko)
      { selectors: ['input[name="firstName"]', 'input[placeholder*="First name"]', 'input[placeholder*="first name"]', 'input[placeholder*="Imię"]'], value: formData.firstName },
      { selectors: ['input[name="lastName"]', 'input[placeholder*="Last name"]', 'input[placeholder*="last name"]', 'input[placeholder*="Nazwisko"]'], value: formData.lastName },
      { selectors: ['input[name="name"]', 'input[placeholder*="Full name"]', 'input[placeholder*="Imię i nazwisko"]'], value: `${formData.firstName} ${formData.lastName}` },

      // Contact fields (Polish: telefon, e-mail)
      { selectors: ['input[name="email"]', 'input[type="email"]', 'input[placeholder*="email"]', 'input[placeholder*="E-mail"]'], value: formData.email },
      { selectors: ['input[name="phone"]', 'input[type="tel"]', 'input[placeholder*="phone"]', 'input[placeholder*="Phone"]', 'input[placeholder*="Telefon"]', 'input[placeholder*="telefon"]'], value: formData.phone },

      // Location
      { selectors: ['input[name="city"]', 'input[placeholder*="City"]', 'input[placeholder*="city"]', 'input[placeholder*="Miasto"]'], value: formData.city },

      // Professional links
      { selectors: ['input[name="linkedin"]', 'input[name="linkedIn"]', 'input[placeholder*="LinkedIn"]'], value: formData.linkedInUrl },
      { selectors: ['input[name="website"]', 'input[name="portfolio"]', 'input[placeholder*="Website"]'], value: formData.websiteUrl },

      // Availability / Notice period (Polish: okres wypowiedzenia, dostępność)
      { selectors: ['input[placeholder*="notice"]', 'input[placeholder*="availability"]', 'input[placeholder*="wypowiedzenia"]', 'input[placeholder*="dostępność"]', 'input[placeholder*="Dostępność"]'], value: formData.availability },

      // Salary (Polish: wynagrodzenie, stawka)
      { selectors: ['input[placeholder*="salary"]', 'input[placeholder*="Salary"]', 'input[placeholder*="wynagrodzenie"]', 'input[placeholder*="Wynagrodzenie"]', 'input[placeholder*="stawka"]'], value: formData.expectedSalary },

      // Summary/Cover letter
      { selectors: ['textarea[name="summary"]', 'textarea[name="coverLetter"]', 'textarea[placeholder*="summary"]', 'textarea[placeholder*="about"]'], value: formData.summary },
    ];

    // Also try finding by label text for Polish forms
    const labelMappings = [
      { labels: ['imię i nazwisko', 'full name', 'name'], value: `${formData.firstName} ${formData.lastName}` },
      { labels: ['imię', 'first name'], value: formData.firstName },
      { labels: ['nazwisko', 'last name'], value: formData.lastName },
      { labels: ['e-mail', 'email'], value: formData.email },
      { labels: ['telefon', 'phone', 'numer telefonu'], value: formData.phone },
      { labels: ['okres wypowiedzenia', 'notice period', 'dostępność', 'availability'], value: formData.availability },
      { labels: ['wynagrodzenie', 'oczekiwania finansowe', 'salary', 'stawka'], value: formData.expectedSalary },
      { labels: ['linkedin'], value: formData.linkedInUrl },
    ];
    
    // Track filled elements to avoid duplicates
    const filledElements = new Set();

    fieldMappings.forEach(mapping => {
      for (const selector of mapping.selectors) {
        const element = document.querySelector(selector);
        if (element && mapping.value && !filledElements.has(element)) {
          setReactInput(element, mapping.value);
          filledElements.add(element);
          filled++;
          console.log(`Filled by selector: ${selector}`, mapping.value);
          break;
        }
      }
    });

    // Try label-based matching for fields not found by selector
    labelMappings.forEach(mapping => {
      if (mapping.value) {
        const element = findInputByLabel(mapping.labels);
        if (element && !filledElements.has(element)) {
          setReactInput(element, mapping.value);
          filledElements.add(element);
          filled++;
          console.log(`Filled by label: ${mapping.labels[0]}`, mapping.value);
        }
      }
    });

    // Handle checkboxes (consent, GDPR, zgoda - English + Polish)
    const consentCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    consentCheckboxes.forEach(checkbox => {
      const label = checkbox.parentElement?.textContent?.toLowerCase() || '';
      const isConsent = label.includes('consent') || label.includes('agree') || label.includes('privacy') ||
                        label.includes('zgod') || label.includes('akceptuj') || label.includes('wyrażam') ||
                        label.includes('przetwarzanie') || label.includes('rodo') || label.includes('gdpr');
      if (isConsent && !checkbox.checked) {
        checkbox.click();
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        console.log('Checked consent checkbox');
      }
    });
    
    console.log(`Recruitify form: Filled ${filled} fields`);
    
    // Show success message
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = `CV Form Filler: Filled ${filled} fields`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }, 1000);
}

/**
 * Detects if current page is a Recruitify form
 * @returns {boolean} True if on Recruitify form page
 */
function isRecruitifyForm() {
  return window.location.hostname.includes('recruitify.ai') &&
         (window.location.pathname.includes('/job/') || window.location.pathname.includes('/apply'));
}

// Alias for consistency with other mappers
function detectRecruitifyForm() {
  return isRecruitifyForm();
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapCVToRecruitifyForm,
    fillRecruitifyForm,
    isRecruitifyForm
  };
}
