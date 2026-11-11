# Draw Party first-release specification

Last updated: 2026-11-11

## Review status

The user accepted all six final design recommendations and paused to review this consolidated specification tomorrow. Resume at final spec review. Production implementation is awaiting the user's approval.

## Game rules and turn flow

- In-person drawing game using one shared phone. Players draw on paper or a whiteboard and guess aloud.
- Support team mode and free-for-all.
- Free-for-all: everyone except the drawer guesses. First correct guesser earns 1 point; drawer also earns 1 point.
- If the group agrees multiple players guessed correctly simultaneously and cannot identify who was first, allow selecting all tied first guessers. Each earns 1 point; the drawer earns 1 point total.
- Team mode: only the drawer's teammates guess; correct answer earns 1 team point. No steals and no All Play rounds.
- One word per turn. Turn ends on a correct guess or timer expiry.
- Fixed turn rotation regardless of success. Free-for-all rotates through all players. Team mode alternates teams and rotates drawers within each team.
- Users select the initial turn order before play: player order in free-for-all, and team order plus drawer order within each team in team mode. The first entry starts; the selected rotation stays fixed throughout the game.
- Configurable number of rounds. One round means one turn per player in free-for-all, or one turn per team in team mode, including unequal team sizes.
- Default to 3 rounds, with a maximum of 5 rounds. Retain the proposed minimum of 1 round unless the user changes it.
- Timer options: 30, 60, 90, 120 seconds; default 60. Same duration throughout a game.
- Secret-word flow: show Pass to [player], tap Reveal word privately, then Start drawing hides the word and starts the timer.
- During drawing, the drawer can press and hold Show word to privately check the same word. Hide it immediately on release; the timer keeps running. The drawer shields the screen from guessers.
- No word replacements or skips.
- Players judge correctness. Large Guessed! button stops the timer. Team mode awards the active team; free-for-all asks which player guessed and awards guesser and drawer.
- After the drawer privately views the word and starts the timer, place the phone where the group can see it. Any player can tap Guessed! or Pause; the group confirms the result together. The drawer can still use Show word privately.
- Guessed! stops the timer and keeps the word hidden. Resume drawing continues with the same word and remaining time. Confirm result awards points and reveals the word.
- When time expires, end the turn, display Time’s up!, and show the word with No points selected. Allow Count a last-second guess before continuing.
- Offer separate sound and vibration switches, both on by default. The timeout buzzer respects the phone’s sound settings. Vibrate when enabled.
- Ties: extra rounds repeat until a winner is found. Only tied leading players or teams participate. In free-for-all, only those tied players draw and guess; other players sit out the tiebreaker. This supersedes the earlier decision that everyone participates in free-for-all tiebreakers.
- Free-for-all tiebreakers award 1 point to each correct first guesser, including agreed simultaneous first guessers, and no point to the drawer. Team scoring stays unchanged.
- Complete a full tiebreaker round before checking for a winner: one drawing turn per tied player, or one turn per tied team. If the lead remains tied, only those still sharing the lead enter the next extra round.
- Add tiebreaker points to existing scores. Label extra rounds Tiebreaker 1, Tiebreaker 2, and so on. The final scoreboard shows regular points, tiebreaker points, and total points.
- If the unused word pool runs out during a tiebreaker, the tied leaders share the win.

## Language, words, and device support

- English and Arabic. Arabic word bank and interface use natural Egyptian Arabic written in Arabic script, with RTL layout.
- Interface language and game word language are selectable independently. Default word language to the interface language, with an option to change it before starting a game.
- Family-friendly audience approximately ages 8+ and adults.
- Difficulty options: Easy, Medium, Mixed; default Mixed. Easy concrete words; Medium includes actions and short phrases.
- Mixed difficulty uses a shuffled, roughly even mix of Easy and Medium prompts.
- Bundle at least 200 Easy and 200 Medium prompts per language. Review the Egyptian Arabic prompts for natural phrasing.
- Mix categories in the first version. Category selection may come later.
- Offline gameplay; bundled word banks, no account or connection needed to play. Future ads may load when connected at natural breaks, such as between completed games, never during the timer. Offline players can still play.
- Launch as a free, ad-free app for Android and iPhone, with no analytics.
- Support portrait on ordinary phones and foldable cover screens. Support portrait and landscape on unfolded screens, including Samsung Fold devices. No specific foldable test model has been selected.
- Folding or unfolding preserves the turn, word, scores, and remaining time while adapting the layout. Keep the timer running if the app stays visible; pause if the transition hides or locks the app.
- Confirmed adaptive layouts for larger unfolded screens: during drawing, a large timer beside scores and turn information. Keep secret-word screens private, revealing the word only after Reveal word. Do not simply enlarge the phone layout.
- On compact screens, show the timer and current turn during drawing. Show the full scoreboard between turns. On unfolded screens, show scores alongside the timer.
- Support larger text, screen readers, and visual timer alerts alongside sound and vibration.

## Setup, saving, and results

- Free-for-all: 3–12 players. Team mode: 2–4 teams, 2–6 players per team.
- Enter player names, randomly distribute into balanced teams, allow manual team changes before starting.
- Automatically save unfinished games: players, settings, scores, turn order. Recover an interrupted drawing turn with same word and remaining time paused until Resume.
- Keep one unfinished game on the phone. Offer Resume game when the app opens and ask before replacing the saved game with a new one.
- Keep players, teams, turn order, and game rules fixed once play starts. To change the setup, start a new game and confirm before replacing the unfinished game.
- Offer Restart game in the pause menu. After confirmation, start at round one with the same players, teams, turn order, and settings. Reset scores and preserve recent-word history.
- Offer End game in the pause menu. After confirmation, clear the unfinished game and return home. Keep saved groups and recent word history.
- Save multiple named groups locally on the phone, containing player names and last team assignments. Load and edit a group before a game.
- Let players rename or delete groups from the saved groups list. Confirm before deleting. An unfinished game keeps its original roster after a group is renamed or deleted.
- Manual pause freezes timer and hides word. Switching away from app also pauses.
- Keep the screen awake while the drawing timer runs. Use the phone’s normal screen timeout when the timer pauses or the turn ends.
- No repeated words within a game, including tiebreakers. Avoid recently used words across games on the phone until the selected difficulty's pool is exhausted.
- Correct outcome/guesser on result screen. Undo last turn is available after continuing until the next drawer reveals their word.
- Drawing restrictions: no speaking, gestures, letters, or numbers. Explain rules briefly; players enforce them.
- Show a short, skippable rules overview before the first game and a summary of the selected mode’s rules during setup. Keep the full rules available to read anytime from How to play on the home screen.
- The group judges rule violations. An End turn — no points action in the pause menu requires confirmation, then ends the turn without a replacement word and continues the normal rotation.
- Group agrees on answer strictness before play. Suggest synonyms and equivalent dialect terms as the family-friendly default. Players judge.
- Visual style selected: Notebook, a playful paper-and-marker style with warm backgrounds, readable text and large buttons.
- Use Draw Party as the working title.
- Final results show the winner and full scoreboard. Play again reuses the same players and settings; New game allows setup changes. Both reset scores while preserving recent-word history.
- Keep the final scoreboard visible until players leave the results screen. Defer browsable game history until after the first release.

## Prototype

`prototypes/draw-party-prototype.html` is a throwaway interactive visual study with Notebook (selected), Party poster, and Quiet studio alternatives. It supports an English/Egyptian Arabic toggle, sample setup, secret-word reveal, countdown, and result flow. It is not a complete rules implementation and should not be promoted directly to production. Script syntax was checked with Node; full visual/runtime verification was not performed.

It was displayed with the in-conversation visualization renderer. Reload the full visualize skill before creating or updating a visualization.

## Implementation decisions

The technical framework, minimum OS versions, and exact test devices will be selected during implementation planning. The round selector assumes a minimum of one round, with the confirmed default of three and maximum of five.

## Official rules consulted

The user repeatedly asked how Pictionary handles a rule before deciding. These references informed explanations; our agreed rules above are authoritative for this app.

- https://www.hasbro.com/common/instruct/pictionary.pdf — classic timed turns, All Play, no standard steal or offered replacement.
- https://service.mattel.com/instruction_sheets/DPJ62-Eng.pdf — players agree on answer strictness before starting.
- https://developers.google.com/admob/android/interstitial — ads can load separately from local game logic and handle load failures.
