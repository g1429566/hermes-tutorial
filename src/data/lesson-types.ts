export interface Lesson {
  zh: string;
  en: string;
}

export interface CourseLessons {
  [chapterId: string]: Lesson;
}

export const SOURCE_REVISION = '9302ba9e212c63ba24cdf1f47f26b47bcd3b042e';
export const SOURCE_REVIEWED_AT = '2026-11-04';
