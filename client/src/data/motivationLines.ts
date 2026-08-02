// Rotating motivational prompts shown as the "Ask ABY" textarea placeholder
// (client/src/components/mobile/ComposeSheet.tsx), replacing a single
// static line so the sheet doesn't feel repetitive every time it's opened.
const motivationLines: Record<'en' | 'he', string[]> = {
  en: [
    "Name one thing. ABY will carry the rest.",
    "Two minutes of mess here beats an hour in your head.",
    "What's been sitting on you since yesterday?",
    "Say it badly. ABY will straighten it out.",
    "The list you avoid is shorter than it feels — write it.",
    "What would make today count, even a little?",
    "Dump it all. We'll sort the order together.",
    "One line now beats a perfect plan later.",
    "What's the thing you keep pushing to tomorrow?",
    "Start with the annoying one. It's usually 10 minutes.",
    "Nobody's grading the spelling. Just get it out.",
    "Small steps. That's the whole trick.",
    "What do you want off your mind by tonight?",
    "Momentum starts with one sentence.",
  ],
  he: [
    "תגיד דבר אחד. את השאר ABY ייקח.",
    "שתי דקות של בלגן פה שוות שעה בראש.",
    "מה יושב עליך מאתמול?",
    "כתוב את זה עקום. ABY כבר ייישר.",
    "הרשימה שאתה בורח ממנה קצרה ממה שהיא מרגישה.",
    "מה יגרום להיום להיחשב, אפילו קצת?",
    "זרוק הכול. את הסדר נעשה ביחד.",
    "שורה אחת עכשיו עדיפה על תוכנית מושלמת אחר כך.",
    "מה הדבר שאתה דוחה כבר כמה ימים?",
    "תתחיל דווקא מהמעצבן. בדרך כלל זה 10 דקות.",
    "אף אחד לא בודק ניסוח. פשוט תוציא את זה.",
    "צעדים קטנים. זה כל הסוד.",
    "ממה אתה רוצה להשתחרר עד הערב?",
    "תנופה מתחילה במשפט אחד.",
  ],
};

export default motivationLines;
