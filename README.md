# Schoceries

A mobile-first recipe box and shared shopping list. Import recipes from a web link, an Instagram caption, or type them in. Add recipes to the shop with a portion count, and the ingredients merge into one list sorted by supermarket aisle.

Built with React, Vite and Firebase (Google sign-in, Firestore, one Cloud Function, Hosting). Installable as a PWA.

## How it works

- **Link import**: the `importRecipe` Cloud Function fetches the page and reads its schema.org Recipe data (JSON-LD, falling back to microdata). No AI involved. Pages without that data come back with just a title and image for you to fill in.
- **Instagram captions**: parsed in the browser by `src/lib/caption.ts`, which looks for "Ingredients" / "Method" style headings and falls back to spotting quantity lines and numbered steps.
- **Localising**: both kinds of import go through `src/lib/localise.ts` before reaching the editor. It doesn't run on save, so anything changed in the editor afterwards is kept. It removes coriander (lines, list mentions, and sentences in the method), swaps American names for British ones (scallion to spring onion, skillet to frying pan), and converts cups, ounces, pounds, inches and °F to metric. Spoon measures are left as they are. Cups become grams for things you'd weigh (flour, sugar, rice) and millilitres for everything else. It also capitalises the title and the start of each ingredient and step.
- **Merging**: `src/lib/list.ts` turns each ingredient into a name + base unit (g, ml, tsp…). Lines with the same name and unit are added together. Each meal's share is stored separately on the item, so removing a meal takes its quantities back off. Changing an item's quantity on the list stores the difference as a manual amount.
- **Categories**: keyword rules in `src/lib/categories.ts`, with anything unknown going to Misc. Moving an item to another aisle remembers that choice for the household.
- **Week**: recipes added to the shop become meals on the Week tab, shown Monday to Sunday. New meals wait in the To plan tray until you drag them onto a day (a day can hold several, or none). A meal stays planned until it's ticked as cooked; uncooked meals from a finished week drop back into the tray. Earlier weeks are kept as a read-only history of what was cooked. Starting a new shop clears the list but keeps the meals.
- **Staples**: the household's staples list starts those ingredients unticked when adding a recipe to the shop.
- **Sharing**: everything lives under a household document. Adding someone's Google email in Settings (the cog, top right) gives them access when they sign in.

## Setup

1. Create a project at <https://console.firebase.google.com>.
2. Switch it to the **Blaze** (pay as you go) plan. Cloud Functions need it to fetch other websites. Set a budget alert (Google Cloud console > Billing > Budgets) so you get an email if it ever costs anything.
3. **Authentication > Sign-in method**: enable Google.
4. **Firestore Database**: create a database in `europe-west2` (London), production mode.
5. **Project settings > Your apps**: add a Web app, then copy `.env.example` to `.env.local` and fill in the four values from the config it shows.
6. Install and link the project:

   ```sh
   npm install
   npm --prefix functions install
   npx firebase-tools login
   npx firebase-tools use --add   # pick your project
   ```

7. Deploy hosting, Firestore rules and the function:

   ```sh
   npm run deploy
   ```

8. Open `https://<project-id>.web.app` on your phone, sign in, and add it to your home screen (Safari: Share > Add to Home Screen; Chrome: menu > Install app).
9. In Settings (the cog, top right), invite your partner by their Gmail address and send them the link.

## Development

```sh
npm run dev        # local app (uses your real Firebase project and deployed function)
npm test           # parser, categoriser and merge tests
npm run typecheck
```
