import {
  ageInYears,
  isStudentProfileComplete,
  parseGuardians,
  profileCardStillValid,
  requiresParentDetails,
} from './studentProfile';

const today = new Date(2026, 10, 7);

describe('student profile card age', () => {
  test('treats a 15th birthday as 15 and requires parents', () => {
    expect(ageInYears('2011-11-07', today)).toBe(15);
    expect(requiresParentDetails('2011-11-07', today)).toBe(true);
  });

  test('treats the day before a 16th birthday as 15', () => {
    expect(ageInYears('2010-11-08', today)).toBe(15);
    expect(requiresParentDetails('2010-11-08', today)).toBe(true);
  });

  test('does not require parents once the student turns 16', () => {
    expect(ageInYears('2010-11-07', today)).toBe(16);
    expect(requiresParentDetails(new Date(Date.UTC(2010, 10, 7)), today)).toBe(false);
  });
});

describe('profile card guardians', () => {
  test('keeps complete guardian rows and skips blank ones', () => {
    const parsed = parseGuardians([
      { name: '  John Doe ', relation: ' Uncle ' },
      { name: ' ', relation: '' },
      { name: 'Jane Doe', relation: 'Aunt' },
    ]);
    expect(parsed).toEqual({
      ok: true,
      guardians: [
        { name: 'John Doe', relation: 'Uncle' },
        { name: 'Jane Doe', relation: 'Aunt' },
      ],
    });
  });

  test('requires both name and relation when a guardian row is started', () => {
    expect(parseGuardians([{ name: 'John Doe', relation: ' ' }])).toEqual({
      ok: false,
      message: 'Guardian name and relation are required',
    });
  });

  test('allows at most 3 guardians', () => {
    expect(
      parseGuardians([
        { name: 'A', relation: 'Uncle' },
        { name: 'B', relation: 'Aunt' },
        { name: 'C', relation: 'Grandfather' },
        { name: 'D', relation: 'Cousin' },
      ])
    ).toEqual({ ok: false, message: 'A student can have at most 3 guardians' });
  });
});

describe('profileCardStillValid', () => {
  test('accepts a picture alone when the student is over 15', () => {
    expect(
      profileCardStillValid({ profilePicture: 'https://cdn.example/photo.jpg', dateOfBirth: '2010-11-07' }, today)
    ).toBe(true);
  });

  test('requires mother and father when the student is 15 or younger', () => {
    expect(
      profileCardStillValid(
        {
          profilePicture: 'https://cdn.example/photo.jpg',
          dateOfBirth: '2011-11-07',
          motherName: 'Mary Doe',
        },
        today
      )
    ).toBe(false);
    expect(
      profileCardStillValid(
        {
          profilePicture: 'https://cdn.example/photo.jpg',
          dateOfBirth: '2011-11-07',
          motherName: 'Mary Doe',
          fatherName: 'David Doe',
        },
        today
      )
    ).toBe(true);
  });

  test('requires a profile picture for every age', () => {
    expect(profileCardStillValid({ profilePicture: '  ', dateOfBirth: '2010-11-07' }, today)).toBe(false);
  });
});

describe('isStudentProfileComplete', () => {
  const complete = {
    dateOfBirth: '2010-01-01',
    gender: 'male',
    occupation: 'Student',
    referralSource: 'google',
    address: '1 Main Street',
    whatsappNumber: '9876543210',
    emergencyContact: { phone: '9876543210' },
  };

  test('accepts a student who filled every admission field', () => {
    expect(isStudentProfileComplete(complete)).toBe(true);
  });

  test('rejects a student missing WhatsApp or emergency phone', () => {
    expect(isStudentProfileComplete({ ...complete, whatsappNumber: '' })).toBe(false);
    expect(isStudentProfileComplete({ ...complete, emergencyContact: { phone: '123' } })).toBe(false);
  });
});
