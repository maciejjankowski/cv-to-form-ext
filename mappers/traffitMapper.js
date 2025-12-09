/**
 * Mapper for Traffit application forms (billennium.traffit.com)
 * Browser extension compatible version
 */

/**
 * Maps CV data to Traffit form fields
 * @param {Object} cvData - CV data in JSON Resume format
 * @param {Object} options - Additional options for the application
 * @returns {Object} Mapped form data
 */
function mapCVToTraffitForm(cvData, options = {}) {
  const basics = cvData.basics || {};
  
  // Split name into first and last name
  const nameParts = (basics.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  // Get LinkedIn URL
  const linkedInProfile = basics.profiles?.find(p => 
    p.network?.toLowerCase() === 'linkedin'
  );
  
  const formData = {
    firstName: firstName,
    lastName: lastName,
    email: basics.email || '',
    phone: basics.phone || '',
    linkedInUrl: linkedInProfile?.url || '',
    salaryExpectations: options.expectedSalary || '',
    availability: options.availabilityDate || 'Natychmiast',
    agreeToDataProcessing: true,
    agreeToFutureRecruitment: options.agreeToFutureRecruitment !== undefined ? options.agreeToFutureRecruitment : true,
  };
  
  return formData;
}

/**
 * Detects Traffit form and returns field selectors
 */
function detectTraffitForm() {
  // Ensure we are on Traffit public form
  if (!window.location.hostname.includes('traffit.com')) return null;

  // Prefer the public form element
  const form = document.querySelector('form.main__form, form[name="dynamic_form"], form');
  if (!form) return null;

  // Helper to find by Traffit data-sid attribute or label text
  const bySid = (sid) => form.querySelector(`[data-sid="${sid}"]`);

  const findInputByLabel = (labelTexts) => {
    for (const text of labelTexts) {
      const labels = Array.from(form.querySelectorAll('label'));
      const label = labels.find(l => l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const el = form.querySelector(`#${forAttr}`);
          if (el) return el;
        }
        const parent = label.closest('.form-group, div, fieldset') || form;
        const input = parent.querySelector('input, textarea, select');
        if (input) return input;
      }
    }
    return null;
  };

  // Identify checkboxes by known ids or clause text
  const findCheckboxByIdOrText = (id, textSnippet) => {
    const byId = form.querySelector(`#${id}`);
    if (byId) return byId;
    return Array.from(form.querySelectorAll('input[type="checkbox"]')).find(cb => {
      const lbl = form.querySelector(`label[for="${cb.id}"]`) || cb.closest('label');
      return lbl && lbl.textContent.toLowerCase().includes(textSnippet);
    });
  };

  // Find all checkboxes that need to be checked (consent checkboxes)
  const allCheckboxes = Array.from(form.querySelectorAll('input[type="checkbox"]'));

  // Track which elements we've already assigned to avoid duplicates
  const usedElements = new Set();

  const findInputByLabelExclusive = (labelTexts) => {
    for (const text of labelTexts) {
      const labels = Array.from(form.querySelectorAll('label'));
      const label = labels.find(l => l.textContent.toLowerCase().includes(text.toLowerCase()));
      if (label) {
        const forAttr = label.getAttribute('for');
        if (forAttr) {
          const el = form.querySelector(`#${forAttr}`);
          if (el && !usedElements.has(el)) {
            usedElements.add(el);
            return el;
          }
        }
        const parent = label.closest('.form-group, div, fieldset') || form;
        const input = parent.querySelector('input, textarea, select');
        if (input && !usedElements.has(input)) {
          usedElements.add(input);
          return input;
        }
      }
    }
    return null;
  };

  // Find fields in specific order to avoid conflicts
  const firstNameField = bySid('firstName') || findInputByLabelExclusive(['imię', 'first name']);
  const lastNameField = bySid('lastName') || findInputByLabelExclusive(['nazwisko', 'last name', 'surname']);
  const emailField = bySid('email') || findInputByLabelExclusive(['email', 'e-mail']);
  const phoneField = bySid('mobile') || findInputByLabelExclusive(['telefon', 'phone', 'mobile']);
  // LinkedIn field
  const linkedInField = bySid('linkedin') || bySid('linkedIn') || bySid('linkedin_url') || findInputByLabelExclusive([
    'linkedin', 'profil linkedin', 'linkedin profile', 'linkedin url'
  ]);
  // About/message field - be very specific, avoid matching name fields
  const aboutField = bySid('candidate_about') || findInputByLabelExclusive(['chcesz nam coś więcej', 'coś więcej', 'wiadomość', 'message']);

  return {
    form,
    fields: {
      firstName: firstNameField,
      lastName: lastNameField,
      email: emailField,
      phone: phoneField,
      linkedInUrl: linkedInField,
      about: aboutField,
      languages: bySid('candidate_languages') || form.querySelector('select[multiple]'),
      cvFile: form.querySelector('input[type="file"]'),

      // Location field (various names)
      location: bySid('location') || bySid('city') || findInputByLabelExclusive([
        'lokalizacja', 'miasto', 'city', 'location', 'miejsce'
      ]),

      // Availability field (various names) - can be SELECT or INPUT
      availability: bySid('availability') || bySid('available_from') || bySid('start_date') || findInputByLabelExclusive([
        'dostępność', 'availability', 'kiedy możesz', 'od kiedy', 'notice period',
        'okres wypowiedzenia', 'data rozpoczęcia', 'when are you able to start', 'start work'
      ]),

      // Availability SELECT (for dropdowns)
      availabilitySelect: form.querySelector('select[name*="7489"]') ||
        Array.from(form.querySelectorAll('select')).find(s => {
          const label = form.querySelector(`label[for="${s.id}"]`);
          return label && (label.textContent.toLowerCase().includes('start work') ||
                          label.textContent.toLowerCase().includes('dostępność') ||
                          label.textContent.toLowerCase().includes('when are you able'));
        }),

      // Salary expectations (various names)
      salaryExpectations: bySid('salary') || bySid('salary_expectations') || bySid('expected_salary') || findInputByLabelExclusive([
        'wynagrodzenie', 'salary', 'oczekiwania finansowe', 'stawka', 'pensja',
        'financial expectations', 'your financial'
      ]),

      // Additional info / message textarea
      additionalInfo: form.querySelector('textarea[name*="7492"]') ||
        Array.from(form.querySelectorAll('textarea')).find(t => {
          const label = form.querySelector(`label[for="${t.id}"]`);
          return label && (label.textContent.toLowerCase().includes('additional') ||
                          label.textContent.toLowerCase().includes('dodatkowe') ||
                          label.textContent.toLowerCase().includes('message'));
        }),

      // Employment type radio buttons
      employmentTypeB2B: form.querySelector('input[type="radio"][id*="7491_0"]') ||
        Array.from(form.querySelectorAll('input[type="radio"]')).find(r => {
          const label = form.querySelector(`label[for="${r.id}"]`);
          return label && label.textContent.toLowerCase().includes('b2b');
        }),
      employmentTypeUoP: form.querySelector('input[type="radio"][id*="7491_1"]') ||
        Array.from(form.querySelectorAll('input[type="radio"]')).find(r => {
          const label = form.querySelector(`label[for="${r.id}"]`);
          return label && (label.textContent.toLowerCase().includes('employment contract') ||
                          label.textContent.toLowerCase().includes('umowa o pracę'));
        }),

      // All consent checkboxes
      allCheckboxes: allCheckboxes,

      // Specific consent checkboxes (fallback)
      dataProcessingConsent: findCheckboxByIdOrText('dynamic_form_provisions_2', 'przetwarzanie moich danych'),
      futureRecruitmentConsent: findCheckboxByIdOrText('dynamic_form_provisions_1', 'przyszłych rekrutacji')
    }
  };
}

/**
 * Fills the Traffit form with CV data
 */
async function fillTraffitForm(cvData, options = {}) {
  const detected = detectTraffitForm();
  if (!detected) {
    console.log('Traffit form not found on this page');
    return false;
  }

  const formData = mapCVToTraffitForm(cvData, options);
  const fields = detected.fields;
  const basics = cvData.basics || {};

  console.log('Filling Traffit form with data:', formData);
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

  let filledCount = 0;

  // Fill basic fields
  if (await setInputValue(fields.firstName, formData.firstName, 'firstName')) filledCount++;
  if (await setInputValue(fields.lastName, formData.lastName, 'lastName')) filledCount++;
  if (await setInputValue(fields.email, formData.email, 'email')) filledCount++;
  if (await setInputValue(fields.phone, formData.phone, 'phone')) filledCount++;
  if (await setInputValue(fields.linkedInUrl, formData.linkedInUrl, 'linkedInUrl')) filledCount++;

  // Fill location (from CV or default)
  const location = basics.location?.city || basics.location?.region || options.location || 'Warszawa';
  if (await setInputValue(fields.location, location, 'location')) filledCount++;

  // Fill availability - handle both INPUT and SELECT
  const availability = options.availabilityDate || formData.availability || 'Natychmiast';
  if (fields.availabilitySelect) {
    // Handle Selectize/Select2 style dropdowns
    try {
      const selectizeInput = document.querySelector(`#${fields.availabilitySelect.id}-selectized`);
      if (selectizeInput) {
        // Click to open dropdown
        selectizeInput.click();
        await delay(200);

        // Look for matching option in dropdown
        const dropdownItems = document.querySelectorAll('.selectize-dropdown-content .option, .select2-results__option');
        for (const item of dropdownItems) {
          const text = item.textContent.toLowerCase();
          if (text.includes('immediately') || text.includes('natychmiast') || text.includes('asap') || text.includes('1 month') || text.includes('2 weeks')) {
            item.click();
            await delay(100);
            console.log('Selected availability option:', item.textContent);
            filledCount++;
            break;
          }
        }
      } else {
        // Regular select
        const options = fields.availabilitySelect.options;
        for (let i = 0; i < options.length; i++) {
          const optText = options[i].text.toLowerCase();
          if (optText.includes('immediately') || optText.includes('natychmiast') || optText.includes('asap')) {
            fields.availabilitySelect.selectedIndex = i;
            fields.availabilitySelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Selected availability:', options[i].text);
            filledCount++;
            break;
          }
        }
      }
    } catch (e) {
      console.log('Could not set availability select:', e);
    }
  } else if (await setInputValue(fields.availability, availability, 'availability')) {
    filledCount++;
  }

  // Fill salary expectations (with currency)
  const salary = options.expectedSalary || formData.salaryExpectations;
  const salaryWithCurrency = salary ? `${salary} PLN netto` : '';
  if (await setInputValue(fields.salaryExpectations, salaryWithCurrency, 'salaryExpectations')) filledCount++;

  // Fill employment type radio button
  const employmentType = options.employmentType || 'B2B';
  if (employmentType === 'B2B' && fields.employmentTypeB2B) {
    fields.employmentTypeB2B.click();
    await delay(50);
    console.log('Selected employment type: B2B');
    filledCount++;
  } else if ((employmentType === 'UoP' || employmentType === 'Employment') && fields.employmentTypeUoP) {
    fields.employmentTypeUoP.click();
    await delay(50);
    console.log('Selected employment type: Employment Contract');
    filledCount++;
  }

  // Fill about/message field
  if (await setInputValue(fields.about, basics.summary || options.coverLetter || '', 'about')) filledCount++;

  // Fill additional info textarea
  if (await setInputValue(fields.additionalInfo, options.coverLetter || basics.summary || '', 'additionalInfo')) filledCount++;

  // CHECK ALL CHECKBOXES (consent forms)
  console.log(`Found ${fields.allCheckboxes.length} checkboxes to check`);
  for (const checkbox of fields.allCheckboxes) {
    if (!checkbox.checked) {
      try {
        // Try clicking the checkbox
        checkbox.click();
        await delay(100);

        // If still not checked, try direct property
        if (!checkbox.checked) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          await delay(50);
        }

        console.log('Checked checkbox:', checkbox.id || checkbox.name || 'unnamed');
        filledCount++;
      } catch (e) {
        console.log('Could not check checkbox:', e);
      }
    }
  }

  // Also try specific consent checkboxes if not already checked
  if (fields.dataProcessingConsent && !fields.dataProcessingConsent.checked) {
    fields.dataProcessingConsent.click();
    await delay(50);
    console.log('Checked data processing consent');
    filledCount++;
  }

  if (fields.futureRecruitmentConsent && formData.agreeToFutureRecruitment && !fields.futureRecruitmentConsent.checked) {
    fields.futureRecruitmentConsent.click();
    await delay(50);
    console.log('Checked future recruitment consent');
    filledCount++;
  }

  console.log(`Traffit form filled successfully - ${filledCount} fields updated`);

  // Note about CV file upload
  if (fields.cvFile) {
    console.log('Note: CV file upload field detected but must be filled manually');
  }

  return filledCount > 0;
}
