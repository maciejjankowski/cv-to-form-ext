/**
 * Mapper for Workday application forms (*.myworkdayjobs.com)
 * Browser extension compatible version
 * 
 * Workday uses a React-based SPA with dynamic form fields.
 * This mapper handles work history, education, and personal information.
 */

/**
 * Maps CV data to Workday form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToWorkdayForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  const work = cvData.work || [];
  const education = cvData.education || [];
  
  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Get LinkedIn URL
  const linkedInProfile = basics.profiles?.find(p => 
    p.network?.toLowerCase() === 'linkedin'
  );
  
  const formData = {
    // Basic information
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    
    // Location
    country: basics.location?.countryCode || basics.location?.country || 'PL',
    city: basics.location?.city || '',
    
    // Professional links
    linkedInUrl: linkedInProfile?.url || '',
    websiteUrl: basics.url || '',
    
    // Work history
    workHistory: work.map(job => ({
      company: job.name || '',
      position: job.position || '',
      startDate: job.startDate || '',
      endDate: job.endDate || '',
      currentJob: !job.endDate || job.endDate === '',
      description: job.summary || '',
      highlights: job.highlights || []
    })),
    
    // Education
    education: education.map(edu => ({
      institution: edu.institution || '',
      degree: edu.studyType || '',
      field: edu.area || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      completed: !(edu['x-status'] && edu['x-status'].includes('Not completed'))
    })),
    
    // Additional
    summary: basics.summary || '',
    consent: true
  };
  
  return formData;
}

/**
 * Fills the Workday application form with CV data
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options
 */
function fillWorkdayForm(cvData, options = {}) {
  const formData = mapCVToWorkdayForm(cvData, options);
  
  console.log('Filling Workday form with data:', formData);
  
  // Helper function to set React-based input
  const setReactInput = (element, value) => {
    if (!element || value === undefined || value === null) return false;
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    
    if (element.tagName === 'TEXTAREA') {
      nativeTextAreaValueSetter?.call(element, value);
    } else {
      nativeInputValueSetter?.call(element, value);
    }
    
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  };
  
  // Helper to click buttons by text content
  const clickButtonByText = (text) => {
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const button = buttons.find(b => 
      b.textContent.toLowerCase().includes(text.toLowerCase())
    );
    if (button) {
      button.click();
      return true;
    }
    return false;
  };
  
  // Helper to find and fill input by label
  const fillByLabel = (labelText, value) => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find(l => 
      l.textContent.toLowerCase().includes(labelText.toLowerCase())
    );
    
    if (label) {
      // Try data-automation-id or for attribute
      const labelFor = label.getAttribute('for');
      let input = null;
      
      if (labelFor) {
        input = document.getElementById(labelFor);
      } else {
        // Look for input near the label
        const parent = label.closest('[data-automation-id], div');
        input = parent?.querySelector('input, textarea, select');
      }
      
      if (input) {
        return setReactInput(input, value);
      }
    }
    return false;
  };
  
  // Wait for Workday React app to be ready
  setTimeout(() => {
    let filled = 0;
    
    console.log('Attempting to fill Workday form...');
    
    // Basic information - try common Workday field patterns
    const basicFields = [
      { labels: ['first name', 'given name'], value: formData.firstName },
      { labels: ['last name', 'family name', 'surname'], value: formData.lastName },
      { labels: ['email', 'e-mail'], value: formData.email },
      { labels: ['phone', 'telephone', 'mobile'], value: formData.phone },
      { labels: ['city', 'location'], value: formData.city },
      { labels: ['linkedin'], value: formData.linkedInUrl },
      { labels: ['website', 'personal website'], value: formData.websiteUrl },
    ];
    
    basicFields.forEach(field => {
      for (const label of field.labels) {
        if (fillByLabel(label, field.value)) {
          filled++;
          console.log(`Filled: ${label}`);
          break;
        }
      }
    });
    
    // Fill work history
    if (formData.workHistory && formData.workHistory.length > 0) {
      console.log(`Processing ${formData.workHistory.length} work history entries...`);
      
      formData.workHistory.forEach((job, index) => {
        // Look for "Add Work Experience" or similar button
        if (index > 0) {
          const added = clickButtonByText('add') || 
                       clickButtonByText('add work') ||
                       clickButtonByText('add another');
          if (added) {
            console.log('Clicked add work experience button');
            // Wait for new fields to appear
            setTimeout(() => fillWorkHistoryEntry(job, index), 500);
          }
        } else {
          fillWorkHistoryEntry(job, index);
        }
      });
    }
    
    // Handle checkboxes
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        const label = cb.closest('label') || 
                     document.querySelector(`label[for="${cb.id}"]`);
        const labelText = label?.textContent?.toLowerCase() || '';
        
        if (labelText.includes('consent') || 
            labelText.includes('privacy') || 
            labelText.includes('agree') ||
            labelText.includes('terms')) {
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
          filled++;
        }
      });
    }, 2000);
    
    console.log(`Workday form: Filled ${filled} basic fields`);
    
    // Show notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0875E1;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    `;
    notification.textContent = `CV AutoFill: Processing ${formData.workHistory.length} jobs...`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  }, 1500);
  
  /**
   * Fill a single work history entry
   */
  function fillWorkHistoryEntry(job, index) {
    console.log(`Filling work history ${index + 1}: ${job.position} at ${job.company}`);
    
    const workFields = [
      { labels: ['company', 'employer', 'organization'], value: job.company },
      { labels: ['title', 'position', 'job title', 'role'], value: job.position },
      { labels: ['start date', 'from date', 'began'], value: formatDateForWorkday(job.startDate) },
      { labels: ['end date', 'to date', 'until'], value: job.currentJob ? '' : formatDateForWorkday(job.endDate) },
      { labels: ['description', 'responsibilities', 'duties'], value: job.description },
    ];
    
    workFields.forEach(field => {
      for (const label of field.labels) {
        if (fillByLabel(label, field.value)) {
          console.log(`  - Filled: ${label}`);
          break;
        }
      }
    });
    
    // Handle "currently working here" checkbox
    if (job.currentJob) {
      const currentCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const currentCheckbox = currentCheckboxes.find(cb => {
        const label = cb.closest('label')?.textContent?.toLowerCase() || '';
        return label.includes('current') || label.includes('present');
      });
      
      if (currentCheckbox) {
        currentCheckbox.checked = true;
        currentCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('  - Marked as current position');
      }
    }
  }
  
  /**
   * Format date for Workday (MM/YYYY or MM/DD/YYYY)
   */
  function formatDateForWorkday(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  }
}

/**
 * Detects if current page is a Workday application form
 * @returns {boolean} True if on Workday form page
 */
function detectWorkdayForm() {
  return window.location.hostname.includes('myworkdayjobs.com') && 
         (window.location.pathname.includes('/apply') || 
          document.querySelector('[data-automation-id*="apply"]') !== null);
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapCVToWorkdayForm,
    fillWorkdayForm,
    detectWorkdayForm
  };
}
