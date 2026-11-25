# Saved groups, interrupted writes, and bilingual content

## T30–T31 recovery checks

- A game created from a saved group keeps the original player names and team assignments after the group is edited, renamed, and deleted. The test starts the game from the group read from SQLite.
- The disk-backed SQLite test closes and reopens the database at handoff, reveal, pause, guess confirmation, result, scoreboard, tiebreaker, and final results. Repeated commands leave the expected score of 2–1 and four distinct reserved words. Transaction tests also inject failed writes and verify that retries preserve the prior committed state until the retry succeeds.
- The controlled timing cases measured 650 ms of restored time after a normal checkpoint, 2,500 ms with a delayed write, 1,450 ms after a failed write, and 2,350 ms for simulated termination during a pending write. These are controlled observations, and the normal checkpoint interval is 1,000 ms. Actual checkpoint age can grow when writes stall. See [the timing fixture and earlier observations](T21-T25-CHECKS.md).
- The Android recovery scenario force-stops and relaunches the app through the core phases, compares committed saves, and reports the age of the active timer checkpoint at process termination. The run timed out in ADB during launch, so the emulator phase checks and device measurement remain open.

## T32–T34 word banks

Each language has 218 Easy and 222 Medium prompts, for 880 prompts across English and Egyptian Arabic. The previous concept IDs and prompts remain available to saved games and recent-word history.

The English editorial pass checked that Easy prompts name concrete, recognizable objects and creatures, and Medium prompts describe actions and scenes that can be communicated visually. It checked vocabulary and subject matter for a family group aged roughly eight and up, and removed near-overlaps such as making lemonade and squeezing lemons. A few Medium prompts deliberately use subjects that take more visual context, such as a baggage carousel or a relay baton.

The app uses the complete word bank for setup, new games, and resumed games. Automated checks validate IDs, languages, difficulty labels, expected scripts, normalized duplicates, and 60 distinct regular turns in each of the six language and difficulty combinations. Those games also have enough words to open a full tiebreaker round.

Independent native Egyptian Arabic review is outstanding. No reviewer was available for this pass. The bilingual source places both prompts on the same concept row so reviewers can flag specific IDs for phrasing, familiarity, drawability, or family suitability.

## T35 interface

The copy audit covered the production home, rules, setup, order review, saved groups, recovery, play, and result screens. The checks require two nonempty translations with matching interpolation keys. Mixed-script names use directional isolates in surrounding text. The saved-game replacement and group deletion prompts use the app's directional confirmation layout.

Native Egyptian Arabic review of interface wording and physical-phone checks of mixed-script names remain open. The existing project checkpoint defers physical-phone testing to final acceptance.
