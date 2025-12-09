/**
 * Mapper for Greenhouse application forms (*.greenhouse.io)
 * Browser extension compatible version
 */

/**
 * Maps CV data to Greenhouse form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToGreenhouseForm(cvData, options = {}) {
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
  
  // Get GitHub URL
  const githubProfile = basics.profiles?.find(p => 
    p.network?.toLowerCase() === 'github'
  );
  
  const formData = {
    // Basic information
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    
    // Location
    location: basics.location?.city || '',
    
    // Professional links
    linkedInUrl: linkedInProfile?.url || '',
    githubUrl: githubProfile?.url || '',
    websiteUrl: basics.url || '',
    
    // Additional info
    coverLetter: basics.summary || '',
    
    // Options from user
    consent: true
  };
  
  return formData;
}

/**
 * Fills the Greenhouse application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
function fillGreenhouseForm(cvData, options = {}) {
  const formData = mapCVToGreenhouseForm(cvData, options);
  
  console.log('Filling Greenhouse form with data:', formData);
  
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
  
  // Wait for form to be ready
  setTimeout(() => {
    let filled = 0;
    
    // Greenhouse uses specific input IDs
    const fieldMappings = [
      // Name fields
      { selectors: ['input#first_name', 'input[name="job_application[first_name]"]'], value: formData.firstName },
      { selectors: ['input#last_name', 'input[name="job_application[last_name]"]'], value: formData.lastName },
      
      // Contact fields
      { selectors: ['input#email', 'input[name="job_application[email]"]', 'input[type="email"]'], value: formData.email },
      { selectors: ['input#phone', 'input[name="job_application[phone]"]', 'input[type="tel"]'], value: formData.phone },
      
      // Location
      { selectors: ['input#location', 'input[name="job_application[location]"]'], value: formData.location },
      
      // Professional links
      { selectors: ['input[name="job_application[linkedin_url]"]', 'input[placeholder*="LinkedIn"]'], value: formData.linkedInUrl },
      { selectors: ['input[name="job_application[github_url]"]', 'input[placeholder*="GitHub"]'], value: formData.githubUrl },
      { selectors: ['input[name="job_application[website]"]', 'input[placeholder*="Website"]'], value: formData.websiteUrl },
      
      // Cover letter
      { selectors: ['textarea#cover_letter_text', 'textarea[name="job_application[cover_letter_text]"]'], value: formData.coverLetter },
    ];
    
    fieldMappings.forEach(mapping => {
      for (const selector of mapping.selectors) {
        const element = document.querySelector(selector);
        if (element && mapping.value) {
          if (element.tagName === 'TEXTAREA') {
            element.value = mapping.value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            setReactInput(element, mapping.value);
          }
          filled++;
          break;
        }
      }
    });
    
    // Handle checkboxes (GDPR, consent, etc.)
    const consentCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    consentCheckboxes.forEach(checkbox => {
      const label = checkbox.parentElement?.textContent?.toLowerCase() || '';
      const id = checkbox.id?.toLowerCase() || '';
      
      if (label.includes('privacy') || label.includes('consent') || 
          label.includes('agree') || label.includes('terms') ||
          id.includes('gdpr') || id.includes('consent')) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
      }
    });
    
    console.log(`Greenhouse form: Filled ${filled} fields`);
    
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
 * Detects if current page is a Greenhouse form
 * @returns {boolean} True if on Greenhouse form page
 */
function detectGreenhouseForm() {
  return window.location.hostname.includes('greenhouse.io') && 
         (window.location.pathname.includes('/jobs/') || 
          document.querySelector('#application_form') !== null);
}

// Alias for compatibility
function isGreenhouseForm() {
  return detectGreenhouseForm();
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapCVToGreenhouseForm,
    fillGreenhouseForm,
    detectGreenhouseForm,
    isGreenhouseForm
  };
}
