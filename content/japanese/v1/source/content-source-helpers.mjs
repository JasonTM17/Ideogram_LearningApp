const splitRows = (rows) =>
  rows
    .trim()
    .split('\n')
    .map((row) => row.split('|').map((value) => value.trim()));

export const vocabularyEntriesFromRows = (rows) =>
  splitRows(rows).map(([term, reading, meaningVietnamese, example, translationVietnamese]) => ({
    example: { translationVietnamese, value: example },
    meaningVietnamese,
    reading,
    term,
  }));

export const listeningScriptFromRows = (rows) =>
  splitRows(rows).map(
    ([
      slug,
      transcript,
      transcriptVietnamese,
      promptVietnamese,
      correctAnswer,
      distractorOne,
      distractorTwo,
    ]) => ({
      correctAnswer,
      distractorOne,
      distractorTwo,
      promptVietnamese,
      slug,
      transcript,
      transcriptVietnamese,
    }),
  );
