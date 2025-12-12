/**
 * Mapper for eRecruiter application forms (form.erecruiter.pl)
 * Browser extension compatible version
 */

/**
 * Maps CV data to eRecruiter form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToERecruiterForm(cvData, options = {}) {
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
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    country: basics.location?.country || 'Polska',
    city: basics.location?.city || basics.location?.address || '',
    linkedInUrl: linkedInProfile?.url || '',
    availability: basics['x-availability'] || options.availabilityDate || 'natychmiast',
    preferredContractType: basics['x-preferredContractType'] || options.contractType || 'B2B',
    expectedSalary: basics['x-expectedSalary'] || options.expectedSalary || '',
    polishLevel: basics['x-languageSkills']?.polish || options.polishLevel || 'język ojczysty',
    englishLevel: basics['x-languageSkills']?.english || options.englishLevel || 'dobra',
    experienceYears: calculateExperienceYears(),
    agreeToDataProcessing: true,
    agreeToFutureRecruitment: options.agreeToFutureRecruitment !== undefined ? options.agreeToFutureRecruitment : true,
  };
  
  return formData;
}

/**
 * Detects eRecruiter form and returns field selectors
 */
function detectERecruiterForm() {
  try {
    // Check if we're on erecruiter.pl domain
    if (!window.location.hostname.includes('erecruiter.pl')) {
      return null;
    }
    
    // Look for the main form
    const form = document.querySelector('form');
    if (!form) return null;
  
  // Helper to find input by label text
  const findInputByLabel = (labelTexts) => {
    for (const text of labelTexts) {
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find(l => 
        l.textContent.toLowerCase().trim().includes(text.toLowerCase())
      );
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const input = document.querySelector(`#${forAttr}`);
          if (input) return input;
        }
        // Try to find input near the label
        const parent = label.closest('div, section, fieldset');
        if (parent) {
          const input = parent.querySelector('input, textarea, select');
          if (input) return input;
        }
      }
    }
    return null;
  };
  
  return {
    form: form,
    fields: {
      firstName: findInputByLabel(['imię', 'first name']) || 
                 form.querySelector('input[name*="first" i], input[name*="imie" i]'),
      lastName: findInputByLabel(['nazwisko', 'last name', 'surname']) ||
                form.querySelector('input[name*="last" i], input[name*="nazwisko" i]'),
      email: findInputByLabel(['email', 'e-mail']) ||
             form.querySelector('input[type="email"], input[name*="email" i]'),
      phone: findInputByLabel(['telefon', 'phone', 'numer']) ||
             form.querySelector('input[type="tel"], input[name*="phone" i], input[name*="telefon" i]'),
      country: findInputByLabel(['kraj', 'country']) ||
               form.querySelector('select[name*="country" i], select[name*="kraj" i]'),
      city: findInputByLabel(['miasto', 'city']) ||
            form.querySelector('input[name*="city" i], input[name*="miasto" i]'),
      linkedInUrl: findInputByLabel(['linkedin', 'profil']) ||
                   form.querySelector('input[name*="linkedin" i]'),
      // Specific fields with direct IDs
      availability: document.querySelector('#ctl00_DefaultContent_ctl60_lstOptions_0')?.parentElement?.parentElement,
      contractType: document.querySelector('#ctl00_DefaultContent_ctl61_dlstOptions'),
      salaryExpectations: document.querySelector('#ctl00_DefaultContent_ctl62_tbText') ||
                         findInputByLabel(['oczekiwania finansowe', 'salary', 'wynagrodzenie']),
      polishLevel: document.querySelector('#ctl00_DefaultContent_ctl63_dlstOptions'),
      englishLevel: document.querySelector('#ctl00_DefaultContent_ctl64_dlstOptions') ||
                   findInputByLabel(['język angielski', 'english']),
      experienceYears: findInputByLabel(['lat doświadczenia', 'years', 'experience']) ||
                      form.querySelector('select[name*="experience" i], input[name*="experience" i]'),
      cvFile: form.querySelector('input[type="file"]'),
      // Find checkboxes
      dataProcessingConsent: Array.from(form.querySelectorAll('input[type="checkbox"]')).find(cb => {
        const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
        return label && (label.textContent.toLowerCase().includes('zgod') || 
                        label.textContent.toLowerCase().includes('consent'));
      }),
      futureRecruitmentConsent: Array.from(form.querySelectorAll('input[type="checkbox"]')).find(cb => {
        const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
        return label && label.textContent.toLowerCase().includes('przyszł');
      }),
    }
  };
  } catch (error) {
    console.error('Error detecting eRecruiter form:', error);
    return null;
  }
}

/**
 * Fills the eRecruiter form with CV data
 */
async function fillERecruiterForm(cvData, options = {}) {
  try {
    const detected = detectERecruiterForm();
    if (!detected) {
      console.log('eRecruiter form not found on this page');
      return false;
    }
    
    const formData = mapCVToERecruiterForm(cvData, options);
    const fields = detected.fields;
    
    console.log('Filling eRecruiter form with data:', formData);
    console.log('Detected fields:', fields);
    
    // Helper to add delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Helper to set input value
    const setInputValue = async (element, value, fieldName) => {
      if (!element || !value) {
        if (!element) console.log(`Field ${fieldName} not found`);
        if (!value) console.log(`No value for ${fieldName}`);
        return false;
      }
      
      console.log(`Setting ${fieldName} to:`, value);
      
      element.focus();
      await delay(50);
    
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50);
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(50);
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    await delay(50);
    
    return true;
  };
  
  // Helper to set select value
  const setSelectValue = async (element, value, fieldName) => {
    if (!element) {
      console.log(`Field ${fieldName} not found`);
      return false;
    }
    
    console.log(`Setting ${fieldName} select`);
    
    // For select dropdowns, try to find matching option
    if (element.tagName === 'SELECT') {
      const options = Array.from(element.options);
      const matchingOption = options.find(opt => 
        opt.text.toLowerCase().includes(value.toString().toLowerCase()) ||
        opt.value.toLowerCase().includes(value.toString().toLowerCase())
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        await delay(50);
        console.log(`Selected ${fieldName}:`, matchingOption.text);
        return true;
      }
    }
    
    return false;
  };
  
  let filledCount = 0;
  
  // Fill basic fields
  if (await setInputValue(fields.firstName, formData.firstName, 'firstName')) filledCount++;
  if (await setInputValue(fields.lastName, formData.lastName, 'lastName')) filledCount++;
  if (await setInputValue(fields.email, formData.email, 'email')) filledCount++;
  if (await setInputValue(fields.phone, formData.phone, 'phone')) filledCount++;
  
  // Fill location
  if (await setSelectValue(fields.country, formData.country, 'country')) filledCount++;
  if (await setInputValue(fields.city, formData.city, 'city')) filledCount++;
  
  // Fill LinkedIn and salary
  if (await setInputValue(fields.linkedInUrl, formData.linkedInUrl, 'linkedInUrl')) filledCount++;
  if (await setInputValue(fields.salaryExpectations, formData.expectedSalary, 'salaryExpectations')) filledCount++;
  
  // Fill availability (checkboxes)
  if (fields.availability && formData.availability) {
    const availabilityCheckboxes = document.querySelectorAll('[id^="ctl00_DefaultContent_ctl60_lstOptions_"]');
    for (const checkbox of availabilityCheckboxes) {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label && label.textContent.toLowerCase().includes(formData.availability.toLowerCase())) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Checked availability:', formData.availability);
        filledCount++;
        break;
      }
    }
  }
  
  // Fill contract type
  if (await setSelectValue(fields.contractType, formData.preferredContractType, 'contractType')) filledCount++;
  
  // Fill Polish level
  if (await setSelectValue(fields.polishLevel, formData.polishLevel, 'polishLevel')) filledCount++;
  
  // Fill experience years
  if (fields.experienceYears) {
    const yearsValue = formData.experienceYears;
    if (yearsValue >= 5) {
      await setSelectValue(fields.experienceYears, 'więcej', 'experienceYears');
    } else if (yearsValue >= 4) {
      await setSelectValue(fields.experienceYears, '4 - 5', 'experienceYears');
    } else if (yearsValue >= 2) {
      await setSelectValue(fields.experienceYears, '2 - 3', 'experienceYears');
    } else if (yearsValue >= 1) {
      await setSelectValue(fields.experienceYears, '1 rok', 'experienceYears');
    }
    filledCount++;
  }
  
    // Fill English level if provided
  if (formData.englishLevel && await setSelectValue(fields.englishLevel, formData.englishLevel, 'englishLevel')) {
    filledCount++;
  }
  
  // Handle consents - find all consent checkboxes
  const consentCheckboxes = [
    document.querySelector('#ctl00_DefaultContent_rptAllConsents_ctl00_cbxConsent'),
    document.querySelector('#ctl00_DefaultContent_rptAllConsents_ctl01_cbxConsent')
  ];
  
  for (const checkbox of consentCheckboxes) {
    if (checkbox) {
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(100);
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      console.log('Checked consent:', label?.textContent?.substring(0, 50) + '...');
      filledCount++;
    }
  }
  
  // Also check any other consent checkboxes found generically
  if (fields.dataProcessingConsent && formData.agreeToDataProcessing) {
    fields.dataProcessingConsent.checked = true;
    fields.dataProcessingConsent.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Checked data processing consent');
    filledCount++;
  }
  
  if (fields.futureRecruitmentConsent && formData.agreeToFutureRecruitment) {
    fields.futureRecruitmentConsent.checked = true;
    fields.futureRecruitmentConsent.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('Checked future recruitment consent');
    filledCount++;
  }
  
    console.log(`eRecruiter form filled successfully - ${filledCount} fields updated`);
    
    // Note about CV file upload
    if (fields.cvFile) {
      console.log('Note: CV file upload field detected but must be filled manually');
    }
    
    return filledCount > 0;
  } catch (error) {
    console.error('Error filling eRecruiter form:', error);
    return false;
  }
}
