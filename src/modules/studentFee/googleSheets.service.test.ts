import { getConfiguredSpreadsheetId } from './googleSheets.service';

describe('getConfiguredSpreadsheetId', () => {
  test('extracts the ID from an editable spreadsheet URL', () => {
    expect(
      getConfiguredSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/1vusY_81TvNxRBZ6YTDqBG7F-tJkoaU3YqoXZnaTZ2kQ/edit?usp=sharing'
      )
    ).toBe('1vusY_81TvNxRBZ6YTDqBG7F-tJkoaU3YqoXZnaTZ2kQ');
  });

  test('continues to accept a bare spreadsheet ID', () => {
    expect(getConfiguredSpreadsheetId('1vusY_81TvNxRBZ6YTDqBG7F-tJkoaU3YqoXZnaTZ2kQ')).toBe(
      '1vusY_81TvNxRBZ6YTDqBG7F-tJkoaU3YqoXZnaTZ2kQ'
    );
  });

  test('rejects published /pubhtml URLs', () => {
    expect(() =>
      getConfiguredSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vQQblEvOkNeEg855aHH7-WvXrOhmHTQ_Tv9VoZNxafdvvq1SuXhJl0iKUkDLKVBXoOBMPIFaM2Kt2PQ/pubhtml'
      )
    ).toThrow('published /pubhtml links cannot be synced');
  });
});
