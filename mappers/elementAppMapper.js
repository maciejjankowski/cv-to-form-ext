/**
 * Mapper for Element App application forms (*.elementapp.ai)
 * Browser extension compatible version
 * 
 * Element App uses standard HTML forms with UUID-based field IDs.
 */

/**
 * Maps CV data to Element App form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToElementAppForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  
  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Map English level from CV format to CEFR
  const mapEnglishLevel = (level) => {
    const levelMap = {
      'dobra': 'B2',
      'bardzo dobra': 'C1',
      'biegła': 'C2',
      'komunikatywna': 'B1',
      'podstawowa': 'A2',
      'brak': 'A1'
    };
    return levelMap[level?.toLowerCase()] || level || 'B2';
  };
  
  const formData = {
    // Basic information
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phoneNumber: basics.phone || '',
    
    // Custom fields based on form
    expectedSalary: basics['x-expectedSalary'] || options.expectedSalary || '',
    hybridWork: options.hybridWork || 'Tak, akceptuję pracę hybrydową z Warszawy (1 dzień w tygodniu)',
    englishLevel: mapEnglishLevel(basics['x-languageSkills']?.english) || options.englishLevel || 'B2',
    availability: basics['x-availability'] || options.availability || 'natychmiast',
    
    // Timezone (auto-detected)
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  
  return formData;
}

/**
 * Fills the Element App application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
function fillElementAppForm(cvData, options = {}) {
  const formData = mapCVToElementAppForm(cvData, options);
  
  console.log('Filling Element App form with data:', formData);
  
  // Helper function to set input value with better event handling
  const setInputValue = (element, value) => {
    if (!element || value === undefined || value === null) return false;
    
    try {
      // Focus first
      element.focus();
      
      // Clear and set value
      element.value = value;
      
      // Trigger events in proper order for form libraries
      const events = [
        new Event('input', { bubbles: true, cancelable: true }),
        new Event('change', { bubbles: true, cancelable: true }),
        new Event('blur', { bubbles: true, cancelable: true })
      ];
      
      events.forEach(event => {
        element.dispatchEvent(event);
      });
      
      // Also try to trigger keydown/keyup for libraries that listen to keyboard
      const keyEvent = new KeyboardEvent('keydown', { bubbles: true });
      element.dispatchEvent(keyEvent);
      
      return true;
    } catch (e) {
      console.error('Error setting input value:', e);
      return false;
    }
  };
  
  let filled = 0;
  
  // Basic fields - fill immediately
  const basicFields = [
    { id: 'firstName', value: formData.firstName, label: 'First Name' },
    { id: 'lastName', value: formData.lastName, label: 'Last Name' },
    { id: 'email', value: formData.email, label: 'Email' },
    { id: 'phoneNumber', value: formData.phoneNumber, label: 'Phone' },
    { id: 'timezone', value: formData.timezone, label: 'Timezone' }
  ];
  
  basicFields.forEach(field => {
    try {
      const element = document.getElementById(field.id);
      if (element && setInputValue(element, field.value)) {
        console.log(`Filled: ${field.label}`);
        filled++;
      }
    } catch (e) {
      console.error(`Error filling ${field.label}:`, e);
    }
  });
  
  // Custom question fields (UUID-based IDs from the specific form)
  const customFields = [
    {
      // Expected salary (B2B hourly rate)
      id: '4ae8a0f8-55b5-4832-a358-81eff02b4cd8',
      value: formData.expectedSalary,
      label: 'Expected Salary'
    },
    {
      // Hybrid work acceptance
      id: '6890c0b3-107f-49fc-902e-151f4b335a9a',
      value: formData.hybridWork,
      label: 'Hybrid Work'
    },
    {
      // English level (CEFR)
      id: '18735447-d833-4f00-a8c3-ec01d15320bf',
      value: formData.englishLevel,
      label: 'English Level'
    },
    {
      // Availability
      id: 'b2c12e78-bffb-444b-8038-577bfd69cb3d',
      value: formData.availability,
      label: 'Availability'
    }
  ];
  
  customFields.forEach(field => {
    try {
      const element = document.getElementById(field.id);
      if (element && setInputValue(element, field.value)) {
        console.log(`Filled: ${field.label}`);
        filled++;
      }
    } catch (e) {
      console.error(`Error filling ${field.label}:`, e);
    }
  });
  
  console.log(`Element App form: Filled ${filled} fields`);
  
  // Show notification
  try {
    if (!document.body) {
      console.log('Document body not available, skipping notification');
      return filled > 0;
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    `;
    notification.textContent = `CV AutoFill: Wypełniono ${filled} pól`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      try {
        notification.remove();
      } catch (e) {
        console.error('Error removing notification:', e);
      }
    }, 3000);
  } catch (e) {
    console.error('Error showing notification:', e);
  }
  
  return filled > 0;
}

/**
 * Detects if current page is an Element App application form
 * @returns {boolean} True if on Element App form page
 */
function detectElementAppForm() {
  try {
    return window.location.hostname.includes('elementapp.ai') && 
           (window.location.pathname.includes('/application/') ||
            (document && document.querySelector('input#firstName') !== null));
  } catch (e) {
    console.error('Error detecting Element App form:', e);
    return false;
  }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapCVToElementAppForm,
    fillElementAppForm,
    detectElementAppForm
  };
}
