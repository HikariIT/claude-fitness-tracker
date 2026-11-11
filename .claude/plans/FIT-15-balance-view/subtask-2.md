# 2. PL/EN message keys for the balance view
**Decisions:** D3, D4, D5, D6, D7

Add a new top-level `"balance"` namespace to both message files. Do not change any other key. `src/global.d.ts` types messages from `pl.json`, so the keys must match exactly in both files. `src/messages/messages.test.ts` checks key parity and that no string is empty.

Add it as the **last** top-level key, after the `"workouts"` object (which starts at line 326 in both files). Add a comma after the closing `}` of `"workouts"`. Keep the 2-space indentation.

Placeholders use ICU syntax (`{name}`). The values passed for them are already formatted strings (formatted numbers and dates), so do not use `{x, number}`.

## `src/messages/en.json`
```json
"balance": {
  "units": { "kcal": "kcal", "kg": "kg" },
  "noProfile": {
    "title": "No personal data yet",
    "description": "The balance needs your basal metabolic rate. Fill in your personal data first.",
    "link": "Go to personal data"
  },
  "day": {
    "title": "Day summary",
    "eaten": "Eaten",
    "expenditure": "Burned",
    "expenditureHint": "Base {baseline} + activity {burned}",
    "balance": "Balance",
    "weightChange": "Weight change",
    "notLogged": "No food logged for this day, so there is no balance.",
    "notLoggedLink": "Open the food planner"
  },
  "status": {
    "deficit": "Deficit of {kcal} kcal",
    "surplus": "Surplus of {kcal} kcal",
    "even": "Even"
  },
  "week": {
    "title": "Week {from} – {to}",
    "day": "Day",
    "eaten": "Eaten",
    "expenditure": "Burned",
    "balance": "Balance",
    "weightChange": "Weight",
    "status": "Status",
    "notLogged": "Not logged",
    "total": "Week total",
    "loggedDays": "Days logged: {count} of 7"
  }
}
```

## `src/messages/pl.json`
```json
"balance": {
  "units": { "kcal": "kcal", "kg": "kg" },
  "noProfile": {
    "title": "Brak danych osobowych",
    "description": "Bilans wymaga Twojej podstawowej przemiany materii. Najpierw uzupełnij dane osobowe.",
    "link": "Przejdź do danych osobowych"
  },
  "day": {
    "title": "Podsumowanie dnia",
    "eaten": "Zjedzone",
    "expenditure": "Spalone",
    "expenditureHint": "Podstawa {baseline} + aktywność {burned}",
    "balance": "Bilans",
    "weightChange": "Zmiana wagi",
    "notLogged": "Brak posiłków w tym dniu, więc nie ma bilansu.",
    "notLoggedLink": "Otwórz planer posiłków"
  },
  "status": {
    "deficit": "Deficyt {kcal} kcal",
    "surplus": "Nadwyżka {kcal} kcal",
    "even": "Na zero"
  },
  "week": {
    "title": "Tydzień {from} – {to}",
    "day": "Dzień",
    "eaten": "Zjedzone",
    "expenditure": "Spalone",
    "balance": "Bilans",
    "weightChange": "Waga",
    "status": "Status",
    "notLogged": "Brak wpisów",
    "total": "Suma tygodnia",
    "loggedDays": "Dni z wpisami: {count} z 7"
  }
}
```

Leave the `"common"` namespace in place: the current balance placeholder page still uses it, and subtask 4 removes it.

**Files:**
- Modify: `src/messages/en.json`: add the `balance` namespace at the end
- Modify: `src/messages/pl.json`: add the `balance` namespace at the end

**Read:** `src/messages/en.json:320-400` (end of the file), `src/messages/pl.json:320-400` (end of the file)

**Verify:** `npx tsc --noEmit && npm test -- src/messages`
