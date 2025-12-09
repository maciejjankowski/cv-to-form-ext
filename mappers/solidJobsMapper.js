/**
 * Mapper for SOLID.jobs application forms
 * Browser extension compatible version
 */

/**
 * Maps CV data to SOLID.jobs form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToSolidJobsForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  const work = cvData.work || [];
  const skills = cvData.skills || [];
  
  // Helper function to get skill names
  const getSkillNames = () => {
    return skills.map(s => s.name).filter(Boolean);
  };
  
  // Helper function to calculate experience years
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
  
  // Helper function to get LinkedIn URL
  const getLinkedInUrl = () => {
    const linkedInProfile = basics.profiles?.find(p => 
      p.network?.toLowerCase() === 'linkedin'
    );
    return linkedInProfile?.url || '';
  };
  
  // Build the form data mapping
  const formData = {
    fullName: basics.name || '',
    email: basics.email || '',
    phone: basics.phone || '',
    employmentType: options.employmentType || 'B2B',
    expectedSalary: options.expectedSalary || '',
    salaryCurrency: options.salaryCurrency || 'PLN netto',
    availabilityDate: options.availabilityDate || 'Natychmiast',
    noticePeriod: options.noticePeriod || '1 miesiąc',
    location: basics.location?.address || basics.location?.city || 'Poland',
    remoteWork: options.remoteWork !== undefined ? options.remoteWork : true,
    cvText: formatCVText(cvData),
    coverLetter: options.coverLetter || '',
    linkedInUrl: getLinkedInUrl(),
    portfolioUrl: basics.url || '',
    skills: getSkillNames().join(', '),
    experienceYears: calculateExperienceYears(),
    acceptCookiesPolicy: options.acceptCookiesPolicy !== undefined ? options.acceptCookiesPolicy : true,
    agreeToDataProcessing: options.agreeToDataProcessing !== undefined ? options.agreeToDataProcessing : true,
    consentForRecruitmentDataHandling: true,
    additionalInfo: options.additionalInfo || '',
  };
  
  return formData;
}

/**
 * Formats CV data as plain text
 */
function formatCVText(cvData) {
  const basics = cvData.basics || {};
  const work = cvData.work || [];
  const education = cvData.education || [];
  const skills = cvData.skills || [];
  
  let cvText = '';
  
  cvText += `${basics.name}\n`;
  if (basics.label) cvText += `${basics.label}\n`;
  cvText += `\n`;
  
  if (basics.email) cvText += `Email: ${basics.email}\n`;
  if (basics.phone) cvText += `Phone: ${basics.phone}\n`;
  if (basics.url) cvText += `Website: ${basics.url}\n`;
  
  const linkedIn = basics.profiles?.find(p => p.network?.toLowerCase() === 'linkedin');
  if (linkedIn?.url) cvText += `LinkedIn: ${linkedIn.url}\n`;
  cvText += `\n`;
  
  if (basics.summary) {
    cvText += `SUMMARY\n${basics.summary}\n\n`;
  }
  
  if (work.length > 0) {
    cvText += `WORK EXPERIENCE\n`;
    work.forEach(job => {
      cvText += `\n${job.position || 'Position'} at ${job.name || 'Company'}\n`;
      const startDate = job.startDate ? new Date(job.startDate).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' }) : '';
      const endDate = job.endDate ? new Date(job.endDate).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' }) : 'Present';
      cvText += `${startDate} - ${endDate}\n`;
      if (job.location) cvText += `${job.location}\n`;
      if (job.summary) cvText += `${job.summary}\n`;
      if (job.highlights && job.highlights.length > 0) {
        job.highlights.forEach(h => cvText += `• ${h}\n`);
      }
    });
    cvText += `\n`;
  }
  
  if (education.length > 0) {
    cvText += `EDUCATION\n`;
    education.forEach(edu => {
      cvText += `\n${edu.studyType || 'Degree'} in ${edu.area || 'Field'}\n`;
      cvText += `${edu.institution || 'Institution'}\n`;
      const startYear = edu.startDate ? new Date(edu.startDate).getFullYear() : '';
      const endYear = edu.endDate ? new Date(edu.endDate).getFullYear() : '';
      if (startYear || endYear) cvText += `${startYear} - ${endYear}\n`;
    });
    cvText += `\n`;
  }
  
  if (skills.length > 0) {
    cvText += `SKILLS\n`;
    skills.forEach(skillGroup => {
      if (skillGroup.name) {
        cvText += `${skillGroup.name}: `;
        if (skillGroup.keywords && skillGroup.keywords.length > 0) {
          cvText += skillGroup.keywords.join(', ');
        }
        cvText += `\n`;
      }
    });
    cvText += `\n`;
  }
  
  if (cvData.languages && cvData.languages.length > 0) {
    cvText += `LANGUAGES\n`;
    cvData.languages.forEach(lang => {
      cvText += `${lang.language || ''} - ${lang.fluency || ''}\n`;
    });
  }
  
  return cvText;
}

/**
 * Detects SOLID.jobs form and returns field selectors
 */
function detectSolidJobsForm() {
  const form = document.querySelector('#enrollForm');
  if (!form) return null;
  
  // Helper to find Angular Material input by searching mat-label text
  const findMatInput = (labelTexts) => {
    for (const text of labelTexts) {
      const matLabels = Array.from(form.querySelectorAll('mat-label'));
      const matLabel = matLabels.find(l => l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (matLabel) {
        // Navigate to the mat-form-field parent and find the input/textarea/select
        const matFormField = matLabel.closest('mat-form-field');
        if (matFormField) {
          return matFormField.querySelector('input, textarea, select');
        }
      }
    }
    return null;
  };
  
  // Get all mat-form-fields in order and separate inputs from mat-selects
  const matFormFields = form.querySelectorAll('mat-form-field');
  const inputs = [];
  const selects = [];
  
  matFormFields.forEach(field => {
    const matSelect = field.querySelector('mat-select');
    const input = field.querySelector('input, textarea');
    
    if (matSelect) {
      selects.push(matSelect);
    } else if (input) {
      inputs.push(input);
    }
  });
  
  return {
    form: form,
    fields: {
      // Inputs in order: name, email, phone, salary, availability, message, linkedin
      fullName: inputs[0] || findMatInput(['imię i nazwisko', 'imię', 'nazwisko', 'name']),
      email: inputs[1] || findMatInput(['e-mail', 'email']) || form.querySelector('input[type="email"]'),
      phone: inputs[2] || findMatInput(['telefon', 'phone', 'numer']) || form.querySelector('input[type="tel"]'),
      expectedSalary: inputs[3] || findMatInput(['wynagrodzeni', 'salary', 'pensj']) || form.querySelector('input[type="number"]'),
      availabilityDate: inputs[4] || findMatInput(['zacząć', 'kiedy', 'start', 'dostępn', 'wypowiedzen']),
      coverLetter: inputs[5] || findMatInput(['wiadomość', 'dodatkow', 'motywacyjny', 'message']) || form.querySelector('textarea'),
      linkedInUrl: inputs[6] || findMatInput(['linkedin', 'linked in']) || form.querySelector('input[placeholder*="linkedin" i]'),
      
      // Mat-selects in order: employment type, currency
      employmentType: selects[0] || findMatInput(['forma zatrudnienia', 'zatrudnienie', 'employment']),
      salaryCurrency: selects[1] || findMatInput(['waluta', 'currency', 'rodzaj']),
      
      // CV text field doesn't exist in this form (file upload only)
      cvText: null,
      portfolioUrl: null, // Not in this form
      dataConsent: form.querySelector('input[type="checkbox"][formcontrolname*="agreement" i]') || 
                   form.querySelector('mat-checkbox input[type="checkbox"]'),
      informationClause: form.querySelectorAll('input[type="checkbox"]')[1],
    }
  };
}

/**
 * Fills the form with CV data
 */
async function fillSolidJobsForm(cvData, options = {}) {
  const detected = detectSolidJobsForm();
  if (!detected) {
    console.log('SOLID.jobs form not found on this page');
    return false;
  }
  
  const formData = mapCVToSolidJobsForm(cvData, options);
  const fields = detected.fields;
  
  console.log('Filling form with data:', formData);
  console.log('Detected fields:', fields);
  
  // Helper to add delay
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Helper to set input value with multiple event triggers
  const setInputValue = async (element, value, fieldName) => {
    if (!element || !value) {
      if (!element) console.log(`Field ${fieldName} not found`);
      if (!value) console.log(`No value for ${fieldName}`);
      return false;
    }
    
    console.log(`Setting ${fieldName} to:`, value);
    
    // For Angular Material mat-select, we need to handle it differently
    const matFormField = element.closest('mat-form-field');
    if (matFormField && element.tagName === 'MAT-SELECT') {
      // Click to open the dropdown
      element.click();
      await delay(100);
      
      // Find and click the option
      const options = document.querySelectorAll('mat-option');
      const option = Array.from(options).find(opt => 
        opt.textContent.trim().toLowerCase().includes(value.toLowerCase())
      );
      if (option) {
        option.click();
        await delay(100);
        console.log(`Selected mat-option for ${fieldName}:`, value);
        return true;
      }
      return false;
    }
    
    // Focus the element first
    element.focus();
    await delay(50);
    
    // Clear existing value
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    
    // Set the new value
    element.value = value;
    
    // Trigger multiple events to ensure Angular detects the change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(50);
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    await delay(50);
    
    return true;
  };
  
  // Helper to check checkbox
  const checkCheckbox = async (element, shouldCheck) => {
    if (!element) return false;
    
    if (element.checked !== shouldCheck) {
      element.click();
      await delay(50);
      console.log('Clicked checkbox:', element);
    }
    return true;
  };
  
  let filledCount = 0;
  
  // Fill basic fields with delays
  if (await setInputValue(fields.fullName, formData.fullName, 'fullName')) filledCount++;
  if (await setInputValue(fields.email, formData.email, 'email')) filledCount++;
  if (await setInputValue(fields.phone, formData.phone, 'phone')) filledCount++;
  
  // Fill employment type (mat-select)
  if (fields.employmentType && fields.employmentType.tagName === 'MAT-SELECT') {
    fields.employmentType.click();
    await delay(150);
    
    // Find the option in the overlay
    const options = document.querySelectorAll('mat-option');
    const option = Array.from(options).find(opt => 
      opt.textContent.trim().toLowerCase().includes(formData.employmentType.toLowerCase())
    );
    if (option) {
      option.click();
      await delay(100);
      console.log('Selected employment type:', formData.employmentType);
      filledCount++;
    }
  }
  
  // Fill salary
  if (await setInputValue(fields.expectedSalary, formData.expectedSalary, 'expectedSalary')) filledCount++;
  
  // Fill salary currency (mat-select)
  if (fields.salaryCurrency && fields.salaryCurrency.tagName === 'MAT-SELECT') {
    fields.salaryCurrency.click();
    await delay(150);
    
    const options = document.querySelectorAll('mat-option');
    const option = Array.from(options).find(opt => 
      opt.textContent.trim().toLowerCase().includes('pln netto')
    );
    if (option) {
      option.click();
      await delay(100);
      console.log('Selected salary currency: PLN netto');
      filledCount++;
    }
  }
  
  // Fill dates and additional info
  if (await setInputValue(fields.availabilityDate, formData.availabilityDate, 'availabilityDate')) filledCount++;
  if (await setInputValue(fields.coverLetter, formData.coverLetter, 'coverLetter')) filledCount++;
  if (await setInputValue(fields.linkedInUrl, formData.linkedInUrl, 'linkedInUrl')) filledCount++;
  
  // Check consent checkboxes - check ALL THREE
  const checkboxes = detected.form.querySelectorAll('mat-checkbox input[type="checkbox"]');
  console.log(`Found ${checkboxes.length} checkboxes`);
  
  if (checkboxes.length >= 3) {
    // Check all three checkboxes
    for (let i = 0; i < 3; i++) {
      if (!checkboxes[i].checked) {
        checkboxes[i].click();
        await delay(50);
        console.log(`Checked checkbox ${i + 1}`);
        filledCount++;
      }
    }
  } else if (checkboxes.length >= 2) {
    // Fallback: check at least the first two required ones
    for (let i = 0; i < checkboxes.length; i++) {
      if (!checkboxes[i].checked) {
        checkboxes[i].click();
        await delay(50);
        console.log(`Checked checkbox ${i + 1}`);
        filledCount++;
      }
    }
  }
  
  console.log(`Form filled successfully - ${filledCount} fields updated`);
  return filledCount > 0;
}
