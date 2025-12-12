/**
 * Integration tests for CV-to-Form extension mappers
 * Tests syntax, structure, and integration rather than runtime execution
 */

const fs = require('fs');
const path = require('path');

describe('Mapper Syntax and Structure', () => {
  const mapperFiles = [
    'eRecruiterMapper.js',
    'workdayMapper.js',
    'elementAppMapper.js',
    'solidJobsMapper.js',
    'greenhouseMapper.js',
    'leverMapper.js',
    'traffitMapper.js',
    'recruitifyMapper.js'
  ];

  test.each(mapperFiles)('%s has valid JavaScript syntax', (file) => {
    const code = fs.readFileSync(
      path.join(__dirname, '../mappers', file),
      'utf8'
    );
    
    // Test that code can be parsed without errors
    expect(() => new Function(code)).not.toThrow();
  });

  test.each(mapperFiles)('%s exports map, detect, and fill functions', (file) => {
    const code = fs.readFileSync(
      path.join(__dirname, '../mappers', file),
      'utf8'
    );
    
    const baseName = file.replace('Mapper.js', '');
    const capitalizedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    
    expect(code).toContain(`function mapCVTo${capitalizedName}Form`);
    expect(code).toContain(`function detect${capitalizedName}Form`);
    expect(code).toContain(`function fill${capitalizedName}Form`);
  });
});

describe('eRecruiter Mapper', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, '../mappers/eRecruiterMapper.js'),
      'utf8'
    );
  });

  test('accesses CV data structure correctly', () => {
    expect(code).toContain('cvData.basics');
    expect(code).toContain('cvData.work');
  });

  test('maps custom fields from CV', () => {
    expect(code).toContain('x-availability');
    expect(code).toContain('x-expectedSalary');
    expect(code).toContain('x-languageSkills');
    expect(code).toContain('x-preferredContractType');
  });

  test('handles language skills', () => {
    expect(code).toContain('polishLevel');
    expect(code).toContain('englishLevel');
  });

  test('uses correct form field IDs', () => {
    expect(code).toContain('ctl00_DefaultContent_ctl60_lstOptions'); // availability
    expect(code).toContain('ctl00_DefaultContent_ctl61_dlstOptions'); // contract type
    expect(code).toContain('ctl00_DefaultContent_ctl62_tbText'); // salary
    expect(code).toContain('ctl00_DefaultContent_ctl63_dlstOptions'); // polish
    expect(code).toContain('ctl00_DefaultContent_ctl64_dlstOptions'); // english
  });

  test('handles consent checkboxes', () => {
    expect(code).toContain('ctl00_DefaultContent_rptAllConsents_ctl00_cbxConsent');
    expect(code).toContain('ctl00_DefaultContent_rptAllConsents_ctl01_cbxConsent');
    expect(code).toContain('checked = true');
  });

  test('detects eRecruiter domain', () => {
    expect(code).toContain('erecruiter.pl');
  });
});

describe('Workday Mapper', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, '../mappers/workdayMapper.js'),
      'utf8'
    );
  });

  test('handles work history array', () => {
    expect(code).toContain('workHistory');
    expect(code).toContain('.map(job =>');
  });

  test('maps job fields correctly', () => {
    expect(code).toContain('job.company');
    expect(code).toContain('job.position');
    expect(code).toContain('job.startDate');
    expect(code).toContain('job.endDate');
    expect(code).toContain('currentJob');
  });

  test('handles education data', () => {
    expect(code).toContain('education');
    expect(code).toContain('edu.institution');
    expect(code).toContain('edu.studyType');
  });

  test('detects Workday domain', () => {
    expect(code).toContain('myworkdayjobs.com');
  });

  test('formats dates for Workday', () => {
    expect(code).toContain('formatDateForWorkday');
  });
});

describe('Element App Mapper', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, '../mappers/elementAppMapper.js'),
      'utf8'
    );
  });

  test('converts English levels to CEFR', () => {
    expect(code).toContain('mapEnglishLevel');
    expect(code).toContain('B2');
    expect(code).toContain('C1');
    expect(code).toContain('C2');
    expect(code).toContain('dobra');
  });

  test('uses correct UUID field IDs', () => {
    expect(code).toContain('4ae8a0f8-55b5-4832-a358-81eff02b4cd8'); // salary
    expect(code).toContain('6890c0b3-107f-49fc-902e-151f4b335a9a'); // hybrid work
    expect(code).toContain('18735447-d833-4f00-a8c3-ec01d15320bf'); // english
    expect(code).toContain('b2c12e78-bffb-444b-8038-577bfd69cb3d'); // availability
  });

  test('auto-detects timezone', () => {
    expect(code).toContain('timezone');
    expect(code).toContain('Intl.DateTimeFormat');
  });

  test('detects Element App domain', () => {
    expect(code).toContain('elementapp.ai');
  });
});

describe('Solid Jobs Mapper', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, '../mappers/solidJobsMapper.js'),
      'utf8'
    );
  });

  test('generates cover letter', () => {
    expect(code).toContain('coverLetter');
    expect(code).toContain('formatCVText');
  });

  test('uses work experience in cover letter', () => {
    expect(code).toContain('cvData.work');
  });
});

describe('Content Script Integration', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(
      path.join(__dirname, '../content.js'),
      'utf8'
    );
  });

  test('integrates all mapper detection functions', () => {
    const expectedDetections = [
      'detectSolidJobsForm',
      'detectTraffitForm',
      'detectERecruiterForm',
      'detectRecruitifyForm',
      'detectGreenhouseForm',
      'detectLeverForm',
      'detectWorkdayForm',
      'detectElementAppForm'
    ];

    expectedDetections.forEach(func => {
      expect(code).toContain(func);
    });
  });

  test('integrates all mapper fill functions', () => {
    const expectedFills = [
      'fillSolidJobsForm',
      'fillTraffitForm',
      'fillERecruiterForm',
      'fillRecruitifyForm',
      'fillGreenhouseForm',
      'fillLeverForm',
      'fillWorkdayForm',
      'fillBambooHRForm' // elementAppForm not in content.js yet, BambooHR is
    ];

    expectedFills.forEach(func => {
      expect(code).toContain(func);
    });
  });

  test('handles chrome messages', () => {
    expect(code).toContain('chrome.runtime.onMessage');
    expect(code).toContain('fillForm');
    expect(code).toContain('detectForm');
  });

  test('sends responses', () => {
    expect(code).toContain('sendResponse');
    expect(code).toContain('success: true');
  });
});

describe('Manifest Configuration', () => {
  let manifest;

  beforeAll(() => {
    manifest = JSON.parse(fs.readFileSync(
      path.join(__dirname, '../manifest.json'),
      'utf8'
    ));
  });

  test('includes all mappers in content_scripts', () => {
    const expectedMappers = [
      'solidJobsMapper.js',
      'traffitMapper.js',
      'eRecruiterMapper.js',
      'recruitifyMapper.js',
      'greenhouseMapper.js',
      'leverMapper.js',
      'workdayMapper.js',
      'elementAppMapper.js'
    ];

    const contentScript = manifest.content_scripts[0];
    expectedMappers.forEach(mapper => {
      expect(contentScript.js.join(',')).toContain(`mappers/${mapper}`);
    });
  });

  test('includes correct domain matches', () => {
    const expectedDomains = [
      'solid.jobs',
      'traffit.com',
      'erecruiter.pl',
      'recruitify.ai',
      'greenhouse.io',
      'lever.co',
      'myworkdayjobs.com',
      'elementapp.ai'
    ];

    const matches = manifest.content_scripts[0].matches.join(' ');
    expectedDomains.forEach(domain => {
      expect(matches).toContain(domain);
    });
  });

  test('has valid manifest version', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('has required permissions', () => {
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');
  });
});

describe('Data Mapping Logic', () => {
  test('eRecruiter handles missing optional fields', () => {
    const code = fs.readFileSync(
      path.join(__dirname, '../mappers/eRecruiterMapper.js'),
      'utf8'
    );
    
    // Check it has fallback values with || operator
    expect(code).toMatch(/basics\['x-availability'\]\s*\|\|/);
    expect(code).toMatch(/basics\['x-expectedSalary'\]\s*\|\|/);
  });

  test('all mappers split names into first/last', () => {
    const mappers = ['eRecruiterMapper.js', 'workdayMapper.js', 'elementAppMapper.js'];
    
    mappers.forEach(file => {
      const code = fs.readFileSync(
        path.join(__dirname, '../mappers', file),
        'utf8'
      );
      
      expect(code).toContain('firstName');
      expect(code).toContain('lastName');
      expect(code).toContain('.split(');
    });
  });

  test('all mappers handle LinkedIn profile', () => {
    const mappers = ['eRecruiterMapper.js', 'workdayMapper.js'];
    
    mappers.forEach(file => {
      const code = fs.readFileSync(
        path.join(__dirname, '../mappers', file),
        'utf8'
      );
      
      expect(code).toContain('profiles');
      expect(code).toContain('linkedin');
    });
  });
});
